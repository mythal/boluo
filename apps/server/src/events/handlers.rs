use super::api::Token;
use super::types::{ConnectionError, UpdateQuery};
use super::Update;
use crate::csrf::authenticate;
use crate::db;
use crate::error::{AppError, Find};
use crate::events::context::get_mailbox_broadcast_rx;
use crate::events::models::StatusKind;
use crate::events::types::ClientEvent;
use crate::interface::{missing, ok_response, parse_query, Response};
use crate::spaces::{Space, SpaceMember};
use crate::utils::timestamp;
use crate::websocket::{establish_web_socket, WsError, WsMessage};
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt, TryStreamExt};
use hyper::body::{Body, Incoming};
use hyper::upgrade::Upgraded;
use hyper::Request;
use hyper_util::rt::TokioIo;
use std::time::{Duration, Instant};
use tokio_stream::StreamExt as _;
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::WebSocketStream;
use uuid::Uuid;

const CHUNK_SIZE: usize = 16;
const TOKEN_VALIDITY: Duration = Duration::from_secs(10);
type Sender = SplitSink<WebSocketStream<TokioIo<Upgraded>>, tungstenite::Message>;

struct TokenInfo {
    user_id: Uuid,
    created_at: Instant,
}

impl TokenInfo {
    fn new(user_id: Uuid) -> Self {
        Self {
            user_id,
            created_at: Instant::now(),
        }
    }
    fn user_id(&self) -> Option<Uuid> {
        if self.created_at.elapsed() < TOKEN_VALIDITY {
            Some(self.user_id)
        } else {
            None
        }
    }
}

static TOKEN_STORE: std::sync::LazyLock<papaya::HashMap<Uuid, TokenInfo>> =
    std::sync::LazyLock::new(papaya::HashMap::new);

pub async fn token_clean() {
    tokio_stream::wrappers::IntervalStream::new(tokio::time::interval(Duration::from_secs(5 * 60)))
        .for_each(|_| async {
            let mut token_store = TOKEN_STORE.pin();
            let now = Instant::now();
            token_store.retain(|_, token| now - token.created_at < TOKEN_VALIDITY);
        })
        .await;
}

async fn check_permissions(
    db: &mut sqlx::PgConnection,
    space: &Space,
    user_id: &Result<Uuid, AppError>,
) -> Result<(), AppError> {
    if space.is_public || space.allow_spectator {
        return Ok(());
    }
    match user_id {
        Ok(user_id) => {
            SpaceMember::get(&mut *db, user_id, &space.id)
                .await
                .or_no_permission()?;
        }
        Err(err) => {
            log::warn!(
                "A user tried to access space but did not pass authentication: {:?}",
                err
            );
            return Err(AppError::NoPermission(
                "This space does not allow non-members to view it.".to_string(),
            ));
        }
    }
    Ok(())
}

// Allow the needless return for keep some visual hints
#[allow(clippy::needless_return)]
async fn push_updates(mailbox: Uuid, outgoing: &mut Sender, after: Option<i64>, seq: Option<u16>) {
    use futures::channel::mpsc::channel;
    use tokio::sync::broadcast::error::RecvError;
    use tokio::time::interval;
    use tokio_stream::wrappers::IntervalStream;
    use tokio_tungstenite::tungstenite::Error::{AlreadyClosed, ConnectionClosed};
    let (tx, mut rx) = channel::<WsMessage>(32);
    let message_sender = async move {
        while let Some(message) = tokio_stream::StreamExt::next(&mut rx).await {
            match outgoing.send(message).await {
                Ok(_) => (),
                Err(ConnectionClosed) | Err(AlreadyClosed) => break,
                Err(e) => {
                    log::error!("Error on sending WebSocket message: {}", e);
                    return;
                }
            }
        }
        return;
    };

    let push = async {
        let mut tx = tx.clone();
        let mut mailbox_rx = get_mailbox_broadcast_rx(mailbox);

        let Some(cached_updates) = Update::get_from_cache(&mailbox, after, seq) else {
            let error_update = Update::error(
                mailbox,
                ConnectionError::Unexpected,
                "Failed to get cached updates".to_string(),
            )
            .encode();
            tx.send(WsMessage::Text(error_update)).await.ok();
            return;
        };
        for message in cached_updates {
            if let Err(err) = tx.send(WsMessage::Text(message)).await {
                log::warn!(
                    "Failed to send initialize updates to mailbox {}: {}",
                    mailbox,
                    err
                );
                return;
            };
        }
        let initialized = Update::initialized(mailbox).encode();
        tx.send(WsMessage::Text(initialized)).await.ok();

        loop {
            let message = match mailbox_rx.recv().await {
                Ok(update) => WsMessage::Text(update.encoded.clone()),
                Err(RecvError::Lagged(lagged)) => {
                    log::warn!("lagged {lagged} at {mailbox}");
                    continue;
                }
                Err(RecvError::Closed) => {
                    log::error!("mailbox {mailbox} closed");
                    return;
                }
            };
            if let Err(e) = tx.send(message).await {
                log::error!("Failed to send broadcast message to {mailbox}: {e}");
                break;
            }
        }
    };

    let ping = IntervalStream::new(interval(Duration::from_secs(3))).for_each(|_| async {
        if let Err(err) = tx
            .clone()
            .send(WsMessage::Text(tungstenite::Utf8Bytes::from_static("♥")))
            .await
        {
            log::warn!("{}", err);
        }
    });

    tokio::select! {
        r = message_sender => { r },
        _ = ping => {},
        r = push => { r },
    }
}

async fn handle_client_event(mailbox: Uuid, user_id: Option<Uuid>, message: &str) {
    let event: Result<ClientEvent, _> = serde_json::from_str(message);
    if let Err(event) = event {
        log::warn!("Failed to parse event from client: {}", event);
        return;
    }
    let event = event.unwrap();
    match event {
        ClientEvent::Preview { preview } => {
            let Some(user_id) = user_id else {
                log::warn!("An user tried to preview without authentication");
                return;
            };
            if let Err(err) = preview.broadcast(mailbox, user_id).await {
                log::warn!("Failed to broadcast preview update: {}", err);
            };
        }
        ClientEvent::Status { kind, focus } => {
            if let Some(user_id) = user_id {
                if let Err(err) = Update::status(mailbox, user_id, kind, timestamp(), focus).await {
                    log::warn!("Failed to broadcast status update: {}", err);
                }
            }
        }
    }
}

fn connection_error(
    req: Request<Incoming>,
    mailbox: Option<Uuid>,
    code: ConnectionError,
    reason: String,
) -> Response {
    let mailbox = mailbox.unwrap_or_default();
    let error_update = Update::error(mailbox, code, reason).encode();
    establish_web_socket(req, |ws_stream| async move {
        let (mut outgoing, _incoming) = ws_stream.split();
        outgoing.send(WsMessage::Text(error_update)).await.ok();
    })
}

async fn connect(req: hyper::Request<Incoming>) -> Response {
    use futures::future;

    let Ok(UpdateQuery {
        mailbox,
        token,
        after,
        seq,
    }) = parse_query(req.uri())
    else {
        log::warn!("Invalid query {:?}", req.uri());
        return connection_error(
            req,
            None,
            ConnectionError::InvalidToken,
            "Invalid query".to_string(),
        );
    };

    let mut user_id = authenticate(&req).await.map(|session| session.user_id);
    if let (user_id @ Err(_), Some(token)) = (&mut user_id, token) {
        if let Some(user_id_from_token) = {
            let token_store = TOKEN_STORE.pin();
            token_store.get(&token).and_then(TokenInfo::user_id)
        } {
            *user_id = Ok(user_id_from_token);
        }
    }

    let pool = db::get().await;
    let Ok(mut conn) = pool.acquire().await else {
        log::error!("Failed to connect to the database");
        return connection_error(
            req,
            Some(mailbox),
            ConnectionError::Unexpected,
            "Failed to connect to the database".to_string(),
        );
    };
    let Ok(space) = Space::get_by_id(&mut *conn, &mailbox).await else {
        log::warn!("Invalid mailbox: {}", mailbox);
        return connection_error(
            req,
            Some(mailbox),
            ConnectionError::NotFound,
            "Invalid mailbox".to_string(),
        );
    };
    if let Some(space) = space.as_ref() {
        let Ok(_) = check_permissions(&mut conn, space, &user_id).await else {
            if let Ok(user_id) = user_id {
                log::warn!(
                    "An user ({user_id}) tried to access a space ({mailbox}) without permission"
                );
            } else {
                log::warn!("An user tried to access a space ({mailbox}) without permission");
            }
            return connection_error(
                req,
                Some(mailbox),
                ConnectionError::NoPermission,
                "No permission".to_string(),
            );
        };
    }
    let user_id = user_id.ok();
    establish_web_socket(req, move |ws_stream| async move {
        let (mut outgoing, incoming) = ws_stream.split();

        let push_updates_future = async move {
            push_updates(mailbox, &mut outgoing, after, seq).await;
            outgoing.close().await.ok();
        };

        let receive_client_events = incoming
            .timeout(Duration::from_secs(40))
            .map_err(|_| {
                log::warn!("Incoming WebSocket connection already closed");
                WsError::AlreadyClosed
            })
            .and_then(future::ready)
            .try_for_each(|message: WsMessage| async move {
                // log::debug!("Received a message from client: {:?}", message);
                if let WsMessage::Text(message) = message {
                    if message == "♡" {
                        return Ok(());
                    }
                    handle_client_event(mailbox, user_id, &message).await;
                }
                Ok(())
            });
        futures::pin_mut!(push_updates_future);
        futures::pin_mut!(receive_client_events);
        let select_result = future::select(push_updates_future, receive_client_events).await;
        log::debug!("WebSocket connection close");
        match select_result {
            future::Either::Left((_, _)) => {
                log::debug!("Stop push updates");
            }
            future::Either::Right((Err(e), _)) => {
                log::warn!("Failed to receive events: {}", e);
            }
            future::Either::Right((Ok(_), _)) => {
                log::debug!("Stop receiving events");
            }
        }
        if let (Some(user_id), Some(space)) = (user_id, space) {
            if let Err(e) =
                Update::status(space.id, user_id, StatusKind::Offline, timestamp(), vec![]).await
            {
                log::warn!("Failed to broadcast offline status: {}", e);
            }
        }
    })
}

pub async fn token(req: Request<impl Body>) -> Result<Token, AppError> {
    if let Ok(session) = authenticate(&req).await {
        let token = Uuid::new_v4();
        {
            let token_store = TOKEN_STORE.pin();
            token_store.insert(token, TokenInfo::new(session.user_id));
        }
        Ok(Token {
            token: Some(token.to_string()),
        })
    } else {
        Ok(Token { token: None })
    }
}

pub async fn router(req: Request<Incoming>, path: &str) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/connect", Method::GET) => Ok(connect(req).await),
        ("/token", Method::GET) => token(req).await.map(ok_response),
        _ => missing(),
    }
}
