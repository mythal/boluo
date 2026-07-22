//! Bridges Boluo spaces to Telegram forum groups: each persisted binding maps
//! Boluo channels to forum topics, and messages flow both ways.

mod boluo;
mod config;
mod store;
mod telegram;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result, anyhow, bail};
use clap::Parser;
use frankenstein::AsyncTelegramApi;
use frankenstein::client_reqwest::Bot;
use frankenstein::methods::CreateForumTopicParams;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::Message as WsMessage;
use tracing::{info, warn};
use uuid::Uuid;

use crate::boluo::{Boluo, SpaceLookup, UpdateBody};
use crate::config::Config;
use crate::store::{Binding, EventCursor, Store, TopicRef};

const BINDING_HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(5 * 60);
const DEFAULT_DATABASE_PATH: &str = "boluo-bridge-v1.sqlite";

#[derive(Debug, thiserror::Error)]
#[error("{0}")]
struct PauseBinding(String);

#[derive(Debug, thiserror::Error)]
#[error("{0}")]
struct RemoveBinding(String);

/// Unregisters a binding's frame sender when its WS session ends, so frames are
/// never routed to a dead connection.
struct WsSenderGuard<'a> {
    bridge: &'a Bridge,
    binding_id: i64,
}

impl Drop for WsSenderGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut senders) = self.bridge.ws_senders.lock() {
            senders.remove(&self.binding_id);
        }
    }
}

#[derive(Debug, Parser)]
#[command(version, about = "Bridge Boluo spaces and Telegram forum groups")]
struct Args {
    /// Path to the bridge KDL or JSON configuration file.
    #[arg(short, long, value_name = "PATH")]
    config: PathBuf,

    /// Path to the SQLite database (overrides the configuration file).
    #[arg(short, long, value_name = "PATH")]
    database: Option<PathBuf>,
}

struct Bridge {
    boluo: Boluo,
    tg: Bot,
    tg_user_id: u64,
    /// Kept to build Telegram file-download URLs, which need the raw token.
    tg_token: String,
    /// Downloads files from Telegram (frankenstein exposes no download helper).
    http: reqwest::Client,
    store: Store,
    workers: Mutex<HashMap<i64, JoinHandle<()>>>,
    previews: telegram::PreviewTracker,
    outbound: telegram::OutboundTracker,
    /// Per-binding WebSocket writer, so the Telegram side can push preview frames
    /// onto a binding's live connection.
    ws_senders: std::sync::Mutex<HashMap<i64, tokio::sync::mpsc::UnboundedSender<String>>>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,bridge=debug".into()),
        )
        .init();

    // Both ring and aws-lc-rs are in the tree, so rustls can't pick a default.
    rustls::crypto::ring::default_provider()
        .install_default()
        .ok();

    let cfg = Config::load(&args.config)
        .with_context(|| format!("failed to load config from {}", args.config.display()))?;
    let database_path = resolve_database_path(args.database, cfg.sqlite_path.clone());
    info!("starting bridge");

    let boluo = if let Some(token) = cfg.bridge_session.clone() {
        Boluo::with_token(cfg.boluo_base_url.clone(), token)
            .await
            .context("failed to authenticate Boluo session token")?
    } else {
        let username = cfg.boluo_username.as_deref().unwrap();
        let password = cfg.boluo_password.as_deref().unwrap();
        Boluo::login(cfg.boluo_base_url.clone(), username, password)
            .await
            .context("failed to log in to Boluo")?
    };

    let store = Store::open(&database_path, &cfg.boluo_base_url).await?;
    let bindings = store.bindings().await?;
    let tg = Bot::new(&cfg.tg_bot_token);
    let tg_user_id = tg
        .get_me()
        .await
        .context("failed to identify the Telegram bot")?
        .result
        .id;

    let bridge = Arc::new(Bridge {
        boluo,
        tg,
        tg_user_id,
        tg_token: cfg.tg_bot_token.clone(),
        http: reqwest::Client::new(),
        store,
        workers: Mutex::new(HashMap::new()),
        previews: telegram::PreviewTracker::default(),
        outbound: telegram::OutboundTracker::default(),
        ws_senders: std::sync::Mutex::new(HashMap::new()),
    });

    for binding in bindings {
        start_binding_worker(&bridge, binding).await;
    }
    info!(
        count = bridge.workers.lock().await.len(),
        "restored bindings"
    );
    telegram::run(bridge).await
}

fn resolve_database_path(cli_path: Option<PathBuf>, config_path: Option<PathBuf>) -> PathBuf {
    cli_path
        .or(config_path)
        .unwrap_or_else(|| PathBuf::from(DEFAULT_DATABASE_PATH))
}

async fn start_binding_worker(bridge: &Arc<Bridge>, binding: Binding) {
    let mut workers = bridge.workers.lock().await;
    if let Some(previous) = workers.remove(&binding.tg_chat_id) {
        previous.abort();
    }
    let worker_bridge = bridge.clone();
    let handle = tokio::spawn(async move {
        if let Err(error) = run_boluo_to_tg(worker_bridge, binding).await {
            warn!(error = %error, group = binding.tg_chat_id, space_id = %binding.space_id, "binding worker exited");
        }
    });
    workers.insert(binding.tg_chat_id, handle);
}

async fn stop_binding_worker(bridge: &Bridge, tg_chat_id: i64) {
    if let Some(worker) = bridge.workers.lock().await.remove(&tg_chat_id) {
        worker.abort();
    }
}

async fn ensure_topic(
    bridge: &Bridge,
    binding: Binding,
    channel_id: Uuid,
) -> Result<Option<TopicRef>> {
    // Space events are not filtered by channel visibility. Check the current
    // user's visible channels before forwarding every message so a membership
    // change cannot leak messages from a hidden channel.
    let channel = visible_channel(bridge, binding, channel_id).await?;
    let Some(channel) = channel else {
        info!(%channel_id, "ignoring message from hidden channel");
        return Ok(None);
    };

    if let Some(topic) = bridge.store.get_topic(binding, channel_id).await? {
        return Ok(Some(topic));
    }
    let name = channel.name;

    let params = CreateForumTopicParams::builder()
        .chat_id(binding.tg_chat_id)
        .name(name.clone())
        .build();
    let created = bridge
        .tg
        .create_forum_topic(&params)
        .await
        .with_context(|| format!("failed to create forum topic for channel {channel_id}"))?;
    let topic = TopicRef {
        tg_chat_id: binding.tg_chat_id,
        message_thread_id: created.result.message_thread_id,
    };
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    bridge
        .store
        .insert_topic(binding, channel_id, topic, now_ms)
        .await?;
    info!(%channel_id, thread = topic.message_thread_id, name, "created forum topic");
    Ok(Some(topic))
}

async fn visible_channel(
    bridge: &Bridge,
    binding: Binding,
    channel_id: Uuid,
) -> Result<Option<generated::Channel>> {
    Ok(bridge
        .boluo
        .channels_by_space(binding.space_id)
        .await?
        .into_iter()
        .find(|channel| channel.id == channel_id && channel.is_public))
}

async fn run_boluo_to_tg(bridge: Arc<Bridge>, binding: Binding) -> Result<()> {
    loop {
        if let Err(e) = ws_session(&bridge, binding).await {
            if let Some(removed) = e.downcast_ref::<RemoveBinding>() {
                let reason = removed.0.clone();
                if let Err(error) = telegram::delete_all_topics(&bridge, binding).await {
                    warn!(error = %error, group = binding.tg_chat_id, "failed to clean up deleted-space topics; retrying in 5s");
                    tokio::time::sleep(Duration::from_secs(5)).await;
                    continue;
                }
                if let Err(error) = bridge.store.unbind(binding.tg_chat_id).await {
                    warn!(error = %error, group = binding.tg_chat_id, "failed to remove deleted-space binding; retrying in 5s");
                    tokio::time::sleep(Duration::from_secs(5)).await;
                    continue;
                }
                info!(group = binding.tg_chat_id, space_id = %binding.space_id, %reason, "binding removed");
                if let Err(error) = telegram::send_notice(
                    &bridge,
                    binding.tg_chat_id,
                    None,
                    format!("Bridge removed: {reason}"),
                )
                .await
                {
                    warn!(error = %error, group = binding.tg_chat_id, "failed to send binding removal notice");
                }
                return Ok(());
            }
            if let Some(paused) = e.downcast_ref::<PauseBinding>() {
                let reason = paused.0.clone();
                bridge
                    .store
                    .pause_binding(binding.id, &reason)
                    .await
                    .context("failed to persist paused binding")?;
                warn!(group = binding.tg_chat_id, space_id = %binding.space_id, %reason, "binding paused");
                if let Err(error) = telegram::send_notice(
                    &bridge,
                    binding.tg_chat_id,
                    None,
                    format!("Bridge paused: {reason} Run /bind again after fixing the problem."),
                )
                .await
                {
                    warn!(error = %error, group = binding.tg_chat_id, "failed to send binding pause notice");
                }
                return Ok(());
            }
            warn!(error = %e, group = binding.tg_chat_id, space_id = %binding.space_id, "WS session ended; reconnecting in 5s");
        }
        tokio::time::sleep(Duration::from_secs(5)).await;
    }
}

async fn ws_session(bridge: &Bridge, binding: Binding) -> Result<()> {
    telegram::validate_binding_health(bridge, binding).await?;
    let token = bridge
        .boluo
        .events_token()
        .await
        .context("failed to get WS token")?;
    let cursor = bridge.store.event_cursor(binding.id).await?;
    let url = bridge.boluo.connect_url(binding.space_id, token, cursor);
    info!(?cursor, group = binding.tg_chat_id, space_id = %binding.space_id, "connecting WS to Boluo");
    let (ws, _resp) = tokio_tungstenite::connect_async(&url)
        .await
        .context("WS connect failed")?;
    let (mut write, mut read) = ws.split();

    // Register this connection so the Telegram side can push preview frames onto
    // it; the guard unregisters it when the session ends.
    let (frame_tx, mut frame_rx) = tokio::sync::mpsc::unbounded_channel::<String>();
    if let Ok(mut senders) = bridge.ws_senders.lock() {
        senders.insert(binding.id, frame_tx);
    }
    let _sender_guard = WsSenderGuard {
        bridge,
        binding_id: binding.id,
    };

    // The server closes connections idle for 40s and treats a "♡" text frame
    // as the client heartbeat.
    let mut heartbeat = tokio::time::interval(Duration::from_secs(30));
    let mut health_check = tokio::time::interval(BINDING_HEALTH_CHECK_INTERVAL);
    health_check.tick().await;

    loop {
        tokio::select! {
            _ = health_check.tick() => {
                telegram::validate_binding_health(bridge, binding).await?;
            }
            _ = heartbeat.tick() => {
                if let Err(e) = write.send(WsMessage::Text("♡".into())).await {
                    warn!(error = %e, "failed to send heartbeat");
                    break;
                }
            }
            client_frame = frame_rx.recv() => {
                let Some(client_frame) = client_frame else { break };
                if let Err(e) = write.send(WsMessage::Text(client_frame.into())).await {
                    warn!(error = %e, "failed to send client frame to Boluo");
                    break;
                }
            }
            frame = read.next() => {
                let Some(frame) = frame else { break };
                let frame = frame.context("WS read error")?;
                let text = match frame {
                    WsMessage::Text(t) => t,
                    WsMessage::Ping(_) | WsMessage::Pong(_) => continue,
                    WsMessage::Close(_) => {
                        info!("WS closed by server");
                        break;
                    }
                    _ => continue,
                };

                let update: boluo::Update = match serde_json::from_str(&text) {
                    Ok(u) => u,
                    Err(_) => continue,
                };
                let persistent_cursor = match update.live {
                    generated::UpdateLifetime::Persistent => Some(event_cursor(&update.id)?),
                    generated::UpdateLifetime::Transient | generated::UpdateLifetime::Volatile => {
                        None
                    }
                };

                match update.body {
                    UpdateBody::NewMessage { channel_id, message, preview_id } => {
                        // Skip our own messages coming back over the socket.
                        if message.sender_id != bridge.boluo.user_id() {
                            telegram::forward_message(bridge, binding, channel_id, &message)
                                .await
                                .with_context(|| {
                                    format!("failed to forward channel {channel_id} message to Telegram")
                                })?;
                            if let Some(preview_id) = preview_id
                                && let Err(error) =
                                    telegram::clear_preview(bridge, binding, preview_id).await
                            {
                                warn!(error = %error, "failed to delete preview message after send");
                            }
                        }
                    }
                    UpdateBody::MessageEdited { message, .. } => {
                        // Skip our own edits (e.g. when syncing a Telegram edit back).
                        if message.sender_id != bridge.boluo.user_id() {
                            telegram::edit_forwarded_message(bridge, binding, &message)
                                .await
                                .with_context(|| {
                                    format!("failed to edit forwarded message {}", message.id)
                                })?;
                        }
                    }
                    UpdateBody::MessageDeleted { message_id, .. } => {
                        telegram::delete_forwarded_message(bridge, binding, message_id)
                            .await
                            .with_context(|| {
                                format!("failed to delete forwarded message {message_id}")
                            })?;
                    }
                    UpdateBody::MessagePreview { channel_id, preview } => {
                        // A preview failure must not tear down the message stream.
                        if let Err(error) =
                            telegram::sync_preview(bridge, binding, channel_id, preview).await
                        {
                            warn!(error = %error, "failed to sync preview to Telegram");
                        }
                    }
                    UpdateBody::Diff { channel_id, diff } => {
                        if let Err(error) =
                            telegram::sync_preview_diff(bridge, binding, channel_id, diff).await
                        {
                            warn!(error = %error, "failed to sync preview diff to Telegram");
                        }
                    }
                    UpdateBody::ChannelEdited { channel, .. } => {
                        telegram::sync_channel(bridge, binding, &channel).await?;
                    }
                    UpdateBody::ChannelDeleted { channel_id } => {
                        telegram::delete_channel_topic(bridge, binding, channel_id).await?;
                    }
                    UpdateBody::SpaceUpdated { space_with_related } => {
                        telegram::sync_space_channels(
                            bridge,
                            binding,
                            &space_with_related.channels,
                        )
                        .await?;
                    }
                    UpdateBody::Error {
                        code: generated::ConnectionError::CursorTooOld,
                        ..
                    } => {
                        bridge.store.clear_event_cursor(binding.id).await?;
                        bail!("Boluo event cursor is too old; cleared it for the next connection");
                    }
                    UpdateBody::Error {
                        code: generated::ConnectionError::NoPermission,
                        ..
                    } => {
                        return match bridge.boluo.lookup_space(binding.space_id).await? {
                            SpaceLookup::NotFound => Err(RemoveBinding(
                                "The bound Boluo space was deleted.".to_string(),
                            )
                            .into()),
                            SpaceLookup::NoPermission | SpaceLookup::Found(_) => Err(PauseBinding(
                                "The configured Boluo account no longer has access to this space."
                                    .to_string(),
                            )
                            .into()),
                        };
                    }
                    UpdateBody::Error {
                        code: generated::ConnectionError::Unauthenticated,
                        ..
                    } => {
                        return Err(PauseBinding(
                            "The configured Boluo account is no longer authenticated.".to_string(),
                        )
                        .into());
                    }
                    UpdateBody::Error { reason, .. } => {
                        bail!("Boluo event stream rejected the connection: {reason}");
                    }
                    _ => {}
                }

                if let Some(cursor) = persistent_cursor {
                    bridge.store.set_event_cursor(binding.id, cursor).await?;
                }
            }
        }
    }
    Ok(())
}

fn event_cursor(id: &generated::EventId) -> Result<EventCursor> {
    if !id.timestamp.is_finite()
        || id.timestamp.fract() != 0.0
        || id.timestamp < 0.0
        || id.timestamp > i64::MAX as f64
    {
        return Err(anyhow!("invalid Boluo event timestamp {}", id.timestamp));
    }
    Ok(EventCursor {
        timestamp: id.timestamp as i64,
        node: id.node,
        seq: id.seq,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cli_requires_config_path() {
        let error = Args::try_parse_from(["bridge"]).unwrap_err();

        assert_eq!(
            error.kind(),
            clap::error::ErrorKind::MissingRequiredArgument
        );
    }

    #[test]
    fn cli_accepts_custom_config_path() {
        let args = Args::try_parse_from(["bridge", "--config", "config/telegram.kdl"]).unwrap();

        assert_eq!(args.config, PathBuf::from("config/telegram.kdl"));
        assert_eq!(args.database, None);
    }

    #[test]
    fn cli_accepts_database_path() {
        let args = Args::try_parse_from([
            "bridge",
            "--config",
            "config/telegram.json",
            "--database",
            "data/bridge.sqlite",
        ])
        .unwrap();

        assert_eq!(args.database, Some(PathBuf::from("data/bridge.sqlite")));
    }

    #[test]
    fn command_line_database_path_takes_precedence() {
        let path = resolve_database_path(
            Some(PathBuf::from("cli.sqlite")),
            Some(PathBuf::from("config.sqlite")),
        );

        assert_eq!(path, PathBuf::from("cli.sqlite"));
    }

    #[test]
    fn database_path_defaults_to_current_directory() {
        let path = resolve_database_path(None, None);

        assert_eq!(path, PathBuf::from(DEFAULT_DATABASE_PATH));
        assert_eq!(path.parent(), Some(std::path::Path::new("")));
    }
}
