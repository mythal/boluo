use super::Update;
use super::api::Token;
use super::types::{Seq, UpdateEncoding, UpdateQuery};
use crate::csrf::authenticate_optional;
use crate::error::{AppError, Find};
use crate::events::api::MakeToken;
use crate::events::get_mailbox_broadcast_rx;
use crate::events::models::StatusKind;
use crate::events::token::SessionError;
use crate::events::types::{ClientEvent, ConnectionError, GetFromStateError};
use crate::interface::{Response, err_response, missing, ok_response, parse_query};
use crate::session::{AuthenticateFail, Session};
use crate::spaces::SpaceMember;
use crate::spaces::models::SpaceRecord;
use crate::utils::timestamp;
use crate::websocket::{WsMessage, establish_web_socket};
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt, TryStreamExt};
use hyper::Request;
use hyper::body::{Body, Incoming};
use hyper::upgrade::Upgraded;
use hyper_util::rt::TokioIo;
use shared_types::events::ClientWebSocketCloseReason;
use std::io::Write;
use std::time::Duration;
use thiserror::Error;
use tokio_stream::StreamExt as _;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::tungstenite::{self, Utf8Bytes};
use uuid::Uuid;

type Sender = SplitSink<WebSocketStream<TokioIo<Upgraded>>, tungstenite::Message>;

enum ReceiveClientEventsTermination {
    PeerClose { code: u16, reason: Utf8Bytes },
    PeerCloseWithoutStatus,
    StreamEnded,
}

fn websocket_close_code_group(code: u16) -> &'static str {
    match code {
        1000 => "normal",
        1001..=2999 => "standard",
        3000..=4999 => "application",
        _ => "invalid",
    }
}

fn record_websocket_close(
    outcome: &'static str,
    client_reason: Option<ClientWebSocketCloseReason>,
    code_group: &'static str,
) {
    metrics::counter!(
        "boluo_server_websocket_closes_total",
        "outcome" => outcome,
        "client_reason" => client_reason
            .map(ClientWebSocketCloseReason::as_str)
            .unwrap_or("NOT_APPLICABLE"),
        "code_group" => code_group,
    )
    .increment(1);
}

struct InitialUpdatesInFlight {
    gauge: metrics::Gauge,
    payload_bytes: u64,
}

impl InitialUpdatesInFlight {
    fn new(updates: &[Utf8Bytes]) -> Self {
        let payload_bytes = updates
            .iter()
            .map(|update| update.len() as u64)
            .sum::<u64>();
        metrics::histogram!("boluo_server_events_push_initial_updates_payload_bytes")
            .record(payload_bytes as f64);
        let gauge = metrics::gauge!("boluo_server_events_initial_updates_in_flight_bytes");
        gauge.increment(payload_bytes as f64);
        Self {
            gauge,
            payload_bytes,
        }
    }
}

impl Drop for InitialUpdatesInFlight {
    fn drop(&mut self) {
        self.gauge.decrement(self.payload_bytes as f64);
    }
}

async fn check_permissions<'c, T: sqlx::PgExecutor<'c>>(
    db: T,
    space: &SpaceRecord,
    session: Option<&Session>,
) -> Result<(), AppError> {
    if space.is_public || space.allow_spectator {
        return Ok(());
    }
    match session {
        Some(session) => {
            if space.owner_id == session.user_id {
                return Ok(());
            }
            SpaceMember::get(db, &session.user_id, &space.id)
                .await
                .or_no_permission()?;
        }
        None => {
            tracing::info!(
                space_id = %space.id,
                "A user tried to access private space but did not pass authentication"
            );
            return Err(AppError::Unauthenticated(AuthenticateFail::Guest));
        }
    }
    Ok(())
}

async fn check_space_permissions(
    ctx: &crate::context::AppContext,
    space_id: Uuid,
    session: Option<&Session>,
) -> Result<(), AppError> {
    if let Some(snapshot) = ctx
        .space_store
        .loaded_authoritative_snapshot_after_wait(space_id)
        .await
    {
        let space = snapshot.space_record();
        if space.is_public || space.allow_spectator {
            return Ok(());
        }
        let Some(session) = session else {
            return Err(AppError::Unauthenticated(AuthenticateFail::Guest));
        };
        if space.owner_id == session.user_id
            || snapshot.space_members.contains_key(&session.user_id)
        {
            return Ok(());
        }
        return Err(AppError::NoPermission(
            "You are not a member of this space".to_string(),
        ));
    }
    let Some(space) = SpaceRecord::get_by_id(&ctx.db, &space_id).await? else {
        return Ok(());
    };
    check_permissions(&ctx.db, &space, session).await
}

#[derive(Debug, Error)]
enum PushUpdatesError {
    #[error("Failed to get cached updates")]
    FailedToGetCachedUpdates,
    #[error("Failed to send message")]
    FailedToSendMessage(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("Failed to receive message")]
    RecvError(#[from] tokio::sync::broadcast::error::RecvError),
}

#[derive(Debug, Error)]
enum CompressCachedUpdatesError {
    #[error("Failed to build compressed payload")]
    Compress(#[from] std::io::Error),
    #[error("Failed to run compression task")]
    Join(#[from] tokio::task::JoinError),
}

const CACHED_UPDATES_CHUNK_MAX_BYTES: usize = 64 * 1024;

fn cached_updates_chunk_len(updates: &[Utf8Bytes], max_bytes: usize) -> usize {
    let mut payload_bytes = 0usize;
    let mut chunk_len = 0usize;

    for update in updates {
        let delimiter_bytes = usize::from(chunk_len > 0);
        let next_payload_bytes = payload_bytes
            .saturating_add(delimiter_bytes)
            .saturating_add(update.len());
        if chunk_len > 0 && next_payload_bytes > max_bytes {
            break;
        }
        payload_bytes = next_payload_bytes;
        chunk_len += 1;
    }

    chunk_len
}

fn serialize_cached_updates(cached_updates: &[Utf8Bytes]) -> Vec<u8> {
    let total_len = cached_updates.iter().map(|x| x.len()).sum::<usize>();
    let delimiter_count = cached_updates.len().saturating_sub(1);
    let mut payload = Vec::with_capacity(total_len + delimiter_count);
    for (index, update) in cached_updates.iter().enumerate() {
        if index > 0 {
            payload.push(b'\n');
        }
        payload.extend_from_slice(update.as_bytes());
    }
    payload
}

fn compress_cached_updates_payload(
    payload: &[u8],
    encoding: UpdateEncoding,
) -> Result<Vec<u8>, std::io::Error> {
    match encoding {
        UpdateEncoding::Plain => Ok(payload.to_vec()),
        UpdateEncoding::Gzip => {
            let mut encoder =
                flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast());
            encoder.write_all(payload)?;
            encoder.finish()
        }
        UpdateEncoding::Brotli => {
            let mut compressed = Vec::new();
            {
                let mut writer = brotli::CompressorWriter::new(&mut compressed, 4096, 5, 22);
                writer.write_all(payload)?;
                writer.flush()?;
            }
            Ok(compressed)
        }
    }
}

async fn compress_cached_updates(
    cached_updates: &[Utf8Bytes],
    encoding: UpdateEncoding,
) -> Result<Vec<u8>, CompressCachedUpdatesError> {
    let cached_updates = cached_updates.to_vec();
    tokio::task::spawn_blocking(move || {
        let payload = serialize_cached_updates(&cached_updates);
        compress_cached_updates_payload(&payload, encoding)
    })
    .await?
    .map_err(CompressCachedUpdatesError::from)
}

async fn push_updates(
    mailbox: Uuid,
    outgoing: &mut Sender,
    mut error_receiver: tokio::sync::mpsc::Receiver<ConnectionError>,
    after: Option<i64>,
    seq: Option<Seq>,
    node: Option<u16>,
    encoding: UpdateEncoding,
) -> Result<(), PushUpdatesError> {
    let mut mailbox_rx = get_mailbox_broadcast_rx(mailbox);
    let start_time = std::time::Instant::now();

    let cached_updates = match Update::get_from_state(&mailbox, after, seq, node).await {
        Ok(updates) => updates,
        Err(GetFromStateError::FailedToQuery) => {
            tracing::error!(
                event = "event_delivery.replay.cache_load_failed",
                mailbox_id = %mailbox,
                "Failed to get cached updates"
            );
            let error_update = Update::error(mailbox, ConnectionError::Unexpected).encode();
            outgoing.send(WsMessage::Text(error_update)).await?;
            return Err(PushUpdatesError::FailedToGetCachedUpdates);
        }
        Err(GetFromStateError::RequestedUpdatesAreTooEarly { start_at }) => {
            metrics::counter!("boluo_server_events_cursor_too_old_total").increment(1);
            tracing::info!(
                mailbox_id = %mailbox,
                after,
                seq,
                node,
                start_at,
                "Cached updates after the cursor were trimmed, asking the client to reset"
            );
            let error_update = Update::error(mailbox, ConnectionError::CursorTooOld).encode();
            outgoing.send(WsMessage::Text(error_update)).await?;
            return Ok(());
        }
    };
    // Track the payload until it is explicitly released after the initial replay is flushed.
    let initial_updates_in_flight = InitialUpdatesInFlight::new(&cached_updates);
    let cached_updates_count = cached_updates.len();
    if !cached_updates.is_empty() {
        if matches!(encoding, UpdateEncoding::Plain) {
            for message in &cached_updates {
                outgoing.feed(WsMessage::Text(message.clone())).await?;
            }
        } else {
            let mut offset = 0;
            while offset < cached_updates.len() {
                let chunk_len = cached_updates_chunk_len(
                    &cached_updates[offset..],
                    CACHED_UPDATES_CHUNK_MAX_BYTES,
                );
                let end = offset + chunk_len;
                let chunk = &cached_updates[offset..end];
                match compress_cached_updates(chunk, encoding).await {
                    Ok(payload) => {
                        // Each chunk is already batched, so flush it immediately to let the client
                        // process replay updates before the next chunk finishes compressing.
                        outgoing.send(WsMessage::Binary(payload.into())).await?;
                        offset = end;
                    }
                    Err(err) => {
                        tracing::warn!(
                            event = "event_delivery.replay.compression_failed",
                            error = %err,
                            mailbox_id = %mailbox,
                            from_index = offset,
                            "Failed to compress cached update chunk, fallback to text frames for remaining updates"
                        );
                        for message in &cached_updates[offset..] {
                            outgoing.feed(WsMessage::Text(message.clone())).await?;
                        }
                        break;
                    }
                }
            }
        }
    }
    let initialized = Update::initialized(mailbox).encode();
    outgoing.feed(WsMessage::Text(initialized)).await?;
    outgoing.flush().await?;

    metrics::histogram!("boluo_server_events_push_initial_updates_duration_ms")
        .record(start_time.elapsed().as_millis() as f64);
    metrics::histogram!("boluo_server_events_push_initial_updates_count")
        .record(cached_updates_count as f64);

    // `push_updates` remains alive for the lifetime of the WebSocket connection. Release the
    // replay payload before entering that loop instead of retaining it until the connection ends.
    drop(cached_updates);
    drop(initial_updates_in_flight);

    let mut last_pending_updates_warned = 0;
    let pending_updates = metrics::histogram!("boluo_server_events_pending_updates");
    let events_sent_counter = metrics::counter!("boluo_server_events_events_sent_total");
    let heartbeat_period = Duration::from_secs(8);
    let mut heartbeat_interval = tokio::time::interval_at(
        tokio::time::Instant::now() + heartbeat_period,
        heartbeat_period,
    );
    heartbeat_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            _ = heartbeat_interval.tick() => {
                outgoing.send(WsMessage::Text(tungstenite::Utf8Bytes::from_static("♥"))).await?;
            }
            _ = crate::shutdown::SHUTDOWN.notified() => {
                break Ok(());
            }
            error = error_receiver.recv() => {
                if let Some(error) = error {
                    outgoing.send(WsMessage::Text(Update::error(mailbox, error).encode())).await?;
                    break Ok(());
                }
            }
            message = mailbox_rx.recv() => {
                let pending = mailbox_rx.len();
                if pending > 0 {
                    pending_updates.record(pending as f64);
                }
                if pending > 64 && (pending - last_pending_updates_warned) > 4 {
                    tracing::info!(pending, "Too many pending updates");
                    last_pending_updates_warned = pending;
                }
                let first_message = message?;
                outgoing.feed(WsMessage::Text(first_message)).await?;
                events_sent_counter.increment(1);
                loop {
                    use tokio::sync::broadcast::error::{TryRecvError, RecvError};
                    match mailbox_rx.try_recv() {
                        Ok(message) => {
                            events_sent_counter.increment(1);
                            outgoing.feed(WsMessage::Text(message)).await?
                        },
                        Err(TryRecvError::Lagged(x)) => {
                            return Err(PushUpdatesError::RecvError(RecvError::Lagged(x)));
                        }
                        Err(_) => {
                            break;
                        }
                    }
                }
                outgoing.flush().await?;
            }
        }
    }
}

async fn handle_client_event(
    ctx: &crate::context::AppContext,
    mailbox: Uuid,
    error_sender: tokio::sync::mpsc::Sender<ConnectionError>,
    session: Option<Session>,
    message: Utf8Bytes,
) {
    let deserialize_result = sonic_rs::from_str::<ClientEvent>(&message);
    let event = match deserialize_result {
        Ok(event) => event,
        Err(e) => {
            tracing::warn!(
                event = "event_delivery.client_message.invalid", error = %e, "Failed to parse event from client");
            error_sender.send(ConnectionError::BadRequest).await.ok();
            return;
        }
    };
    if !mailbox.is_nil() {
        match event {
            ClientEvent::Preview { .. } | ClientEvent::Diff { .. } => {
                // Mark activity even if the event fails to broadcast, so refresh gating can trigger.
                if let Some(manager) = crate::events::context::store().get_manager(&mailbox) {
                    manager.touch_activity().ok();
                }
            }
            ClientEvent::Status { .. } => {
                // Do nothing
            }
        }
    }
    match event {
        ClientEvent::Preview { preview } => {
            let Some(session) = session else {
                tracing::warn!(
                    event = "event_delivery.preview.authentication_required",
                    "An user tried to preview without authentication"
                );
                metrics::counter!("boluo_server_events_preview_without_authentication_total")
                    .increment(1);

                error_sender
                    .send(ConnectionError::Unauthenticated)
                    .await
                    .ok();

                return;
            };
            metrics::counter!("boluo_server_events_preview_total").increment(1);
            if let Err(err) = crate::events::preview::broadcast_preview_post(
                preview,
                ctx,
                mailbox,
                session.user_id,
            )
            .await
            {
                tracing::warn!(
                    event = "event_delivery.preview.broadcast_failed",
                    "Failed to broadcast preview update: {}",
                    err
                );
            };
        }
        ClientEvent::Diff { preview } => {
            let Some(session) = session else {
                tracing::warn!(
                    event = "event_delivery.preview_diff.authentication_required",
                    "An user tried to diff preview without authentication"
                );
                metrics::counter!("boluo_server_events_preview_diff_without_authentication_total")
                    .increment(1);

                error_sender
                    .send(ConnectionError::Unauthenticated)
                    .await
                    .ok();

                return;
            };
            metrics::counter!("boluo_server_events_preview_diff_total").increment(1);
            if let Err(err) =
                crate::events::preview::broadcast_preview_diff(preview, mailbox, session.user_id)
                    .await
            {
                tracing::warn!(
                    event = "event_delivery.preview_diff.broadcast_failed",
                    error = %err,
                    "Failed to broadcast preview diff update"
                );
            }
        }
        ClientEvent::Status { kind, focus } => {
            if let Some(session) = session {
                if let Err(err) =
                    Update::status(mailbox, session.user_id, kind, timestamp(), focus).await
                {
                    tracing::warn!(
                        event = "event_delivery.status.broadcast_failed",
                        "Failed to broadcast status update: {}",
                        err
                    );
                }
            }
        }
    }
}

fn connection_error(
    req: Request<Incoming>,
    mailbox: Option<Uuid>,
    error: ConnectionError,
) -> Response {
    let mailbox = mailbox.unwrap_or_default();
    tracing::error!(
        event = "websocket.connection.error",
        error = %error,
        "WebSocket connection error"
    );
    let error_update = Update::error(mailbox, error).encode();
    establish_web_socket(req, |ws_stream| async move {
        let (mut outgoing, _incoming) = ws_stream.split();
        outgoing.send(WsMessage::Text(error_update)).await.ok();
    })
}

async fn connect(ctx: &crate::context::AppContext, req: hyper::Request<Incoming>) -> Response {
    let user_agent = req
        .headers()
        .get(hyper::header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let origin = req
        .headers()
        .get(hyper::header::ORIGIN)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let Ok(query) = parse_query::<UpdateQuery>(req.uri()) else {
        tracing::warn!(
            event = "websocket.query.invalid",
            path = req.uri().path(),
            "Failed to parse WebSocket query"
        );
        return connection_error(req, None, ConnectionError::BadRequest);
    };
    use futures::future;
    let UpdateQuery {
        mailbox,
        token,
        after,
        seq,
        node,
        encoding,
        user_id,
    } = query;

    let session = if let Some(token) = token {
        super::token::TOKEN_STORE.get_session(token)
    } else {
        match authenticate_optional(ctx, &req).await {
            Ok(Some(session)) => Ok(session),
            Ok(None) => Err(SessionError::Invalid),
            Err(AppError::Unauthenticated(AuthenticateFail::Guest)) => Err(SessionError::Invalid),
            Err(e) => {
                tracing::error!(
                    event = "websocket.authentication.failed", error = %e, "Failed to authenticate the user");
                return connection_error(req, Some(mailbox), ConnectionError::Unexpected);
            }
        }
    };
    if !mailbox.is_nil() {
        if let Err(e) = check_space_permissions(ctx, mailbox, session.as_ref().ok()).await {
            match &e {
                AppError::NoPermission(_) => {
                    return connection_error(req, Some(mailbox), ConnectionError::NoPermission);
                }
                AppError::Unauthenticated(_) => {
                    return connection_error(req, Some(mailbox), ConnectionError::Unauthenticated);
                }
                _ => {
                    tracing::error!(
                        event = "websocket.permission_check.failed", error = %e, "Failed to check permissions");
                    return connection_error(req, Some(mailbox), ConnectionError::Unexpected);
                }
            }
        }
    }

    if let Some(user_id) = user_id {
        match &session {
            Err(SessionError::Expired) => {
                tracing::warn!(
                    event = "websocket.token.expired",
                    user_id = %user_id,
                    mailbox_id = %mailbox,
                    user_agent,
                    origin,
                    "The connection token has expired for the user"
                );
                return connection_error(req, Some(mailbox), ConnectionError::InvalidToken);
            }
            Err(SessionError::Invalid) => {
                tracing::warn!(
                    event = "websocket.session.not_found",
                    user_id = %user_id,
                    mailbox_id = %mailbox,
                    user_agent,
                    origin,
                    "Cannot find session of the user from the provided token"
                );
                return connection_error(req, Some(mailbox), ConnectionError::InvalidToken);
            }
            Ok(session) => {
                if session.user_id != user_id {
                    tracing::error!(
                        event = "websocket.identity_mismatch",
                        session_user_id = %session.user_id,
                        user_id = %user_id,
                        mailbox_id = %mailbox,
                        user_agent,
                        origin,
                        "User ID does not match the authenticated user"
                    );
                    return connection_error(req, Some(mailbox), ConnectionError::BadRequest);
                }
            }
        }
    }

    let ctx = ctx.clone();
    establish_web_socket(req, move |ws_stream| async move {
        let event_connections_active = metrics::gauge!("boluo_server_events_connections_active");
        event_connections_active.increment(1);
        let (mut outgoing, incoming) = ws_stream.split();
        let (error_sender, error_receiver) = tokio::sync::mpsc::channel(1);

        static BASIC_INFO: std::sync::LazyLock<Utf8Bytes> =
            std::sync::LazyLock::new(|| sonic_rs::to_string(&Update::app_info()).unwrap().into());
        if let Err(e) = outgoing.send(WsMessage::Text(BASIC_INFO.clone())).await {
            tracing::warn!(
                event = "event_delivery.basic_info.send_failed", error = %e, "Failed to send basic info");
        }
        let push_updates_future = async move {
            use tokio_tungstenite::tungstenite::Error::{AlreadyClosed, ConnectionClosed};
            match push_updates(
                mailbox,
                &mut outgoing,
                error_receiver,
                after,
                seq,
                node,
                encoding,
            )
            .await
            {
                Ok(_) => tracing::debug!("Stop push updates"),
                Err(PushUpdatesError::FailedToSendMessage(ConnectionClosed | AlreadyClosed)) => {
                    metrics::counter!("boluo_server_events_push_updates_connection_closed_total")
                        .increment(1);
                    tracing::debug!("Connection closed")
                }
                Err(PushUpdatesError::RecvError(
                    tokio::sync::broadcast::error::RecvError::Lagged(count),
                )) => {
                    metrics::counter!("boluo_server_events_broadcast_lagged_total")
                        .increment(count);
                    tracing::warn!(
                        event = "event_delivery.receiver_lagged",
                        count,
                        "Event broadcast receiver lagged"
                    );
                }
                Err(e) => {
                    tracing::warn!(
                        event = "event_delivery.push_failed", error = %e, "Failed to push updates")
                }
            }
            outgoing.close().await.ok();
        };

        let ctx = ctx.clone();
        let incoming = incoming
            .timeout(Duration::from_secs(40))
            .map_err(|_| {
                tungstenite::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::TimedOut,
                    "WebSocket read timeout",
                ))
            })
            .and_then(future::ready);
        let receive_client_events = async move {
            futures::pin_mut!(incoming);
            let mut received_close = None;
            loop {
                let Some(message) = futures::StreamExt::next(&mut incoming).await else {
                    return Ok(
                        received_close.unwrap_or(ReceiveClientEventsTermination::StreamEnded)
                    );
                };
                let message = match message {
                    Ok(message) => message,
                    Err(tungstenite::Error::ConnectionClosed) if received_close.is_some() => {
                        return Ok(received_close.expect("checked above"));
                    }
                    Err(error) => return Err(error),
                };
                match message {
                    WsMessage::Text(message) => {
                        if message == "♡" {
                            continue;
                        }
                        handle_client_event(
                            &ctx,
                            mailbox,
                            error_sender.clone(),
                            session.ok(),
                            message,
                        )
                        .await;
                    }
                    WsMessage::Close(Some(frame)) => {
                        received_close = Some(ReceiveClientEventsTermination::PeerClose {
                            code: u16::from(frame.code),
                            reason: frame.reason,
                        });
                    }
                    WsMessage::Close(None) => {
                        received_close =
                            Some(ReceiveClientEventsTermination::PeerCloseWithoutStatus);
                    }
                    _ => {}
                }
            }
        };
        futures::pin_mut!(push_updates_future);
        futures::pin_mut!(receive_client_events);
        let select_result = future::select(push_updates_future, receive_client_events).await;
        let (close_outcome, client_close_reason, close_code_group) = match select_result {
            future::Either::Left((_, _)) => {
                tracing::debug!("Stop push updates");
                ("push_stopped", None, "not_applicable")
            }
            future::Either::Right((
                Ok(ReceiveClientEventsTermination::PeerClose { code, reason }),
                _,
            )) => {
                let client_close_reason = ClientWebSocketCloseReason::from(reason.as_str());
                tracing::info!(
                    event = "websocket.close.received",
                    mailbox_id = %mailbox,
                    close_code = code,
                    close_reason = %reason,
                    client_close_reason = %client_close_reason,
                    "Received WebSocket close frame"
                );
                (
                    "peer_close",
                    Some(client_close_reason),
                    websocket_close_code_group(code),
                )
            }
            future::Either::Right((
                Ok(ReceiveClientEventsTermination::PeerCloseWithoutStatus),
                _,
            )) => {
                tracing::info!(
                    event = "websocket.close.received",
                    mailbox_id = %mailbox,
                    close_code = 1005,
                    close_reason = "",
                    client_close_reason = %ClientWebSocketCloseReason::Unknown,
                    "Received WebSocket close frame without a status code"
                );
                (
                    "peer_close",
                    Some(ClientWebSocketCloseReason::Unknown),
                    "missing",
                )
            }
            future::Either::Right((
                Err(tungstenite::Error::Protocol(
                    tungstenite::error::ProtocolError::ResetWithoutClosingHandshake,
                )),
                _,
            )) => {
                metrics::counter!(
                    "boluo_server_events_push_updates_reset_without_closing_handshake_total"
                )
                .increment(1);
                tracing::info!(
                    event = "websocket.close.without_handshake",
                    mailbox_id = %mailbox,
                    "WebSocket reset without a closing handshake"
                );
                ("reset_without_handshake", None, "not_applicable")
            }
            future::Either::Right((Err(tungstenite::Error::Io(ref io_err)), _))
                if io_err.kind() == std::io::ErrorKind::TimedOut =>
            {
                metrics::counter!("boluo_server_events_push_updates_read_timeout_total")
                    .increment(1);
                tracing::info!(
                    event = "websocket.close.read_timeout",
                    mailbox_id = %mailbox,
                    timeout_seconds = 40,
                    "WebSocket closed after a read timeout"
                );
                ("read_timeout", None, "not_applicable")
            }
            future::Either::Right((Err(tungstenite::Error::ConnectionClosed), _)) => {
                metrics::counter!("boluo_server_events_push_updates_connection_closed_total")
                    .increment(1);
                tracing::info!(
                    event = "websocket.close.handshake_completed",
                    mailbox_id = %mailbox,
                    "WebSocket closing handshake completed"
                );
                ("handshake_completed", None, "not_applicable")
            }
            future::Either::Right((Err(tungstenite::Error::AlreadyClosed), _)) => {
                metrics::counter!("boluo_server_events_push_updates_already_closed_total")
                    .increment(1);
                tracing::warn!(
                    event = "websocket.already_closed",
                    "Attempted to operate on already closed WebSocket connection"
                );
                ("receive_error", None, "not_applicable")
            }
            future::Either::Right((Err(e), _)) => {
                metrics::counter!(
                    "boluo_server_events_push_updates_failed_to_receive_events_total"
                )
                .increment(1);
                tracing::warn!(
                    event = "event_delivery.receive_failed", error = %e, "Failed to receive events");
                ("receive_error", None, "not_applicable")
            }
            future::Either::Right((Ok(ReceiveClientEventsTermination::StreamEnded), _)) => {
                tracing::debug!("Stop receiving events");
                ("stream_ended", None, "not_applicable")
            }
        };
        record_websocket_close(close_outcome, client_close_reason, close_code_group);
        if let Ok(session) = session {
            if !mailbox.is_nil() {
                if let Err(e) = Update::status(
                    mailbox,
                    session.user_id,
                    StatusKind::Offline,
                    timestamp(),
                    vec![],
                )
                .await
                {
                    tracing::warn!(
                        event = "event_delivery.offline_status.broadcast_failed",
                        "Failed to broadcast offline status: {}",
                        e
                    );
                }
            }
        }
        event_connections_active.decrement(1);
    })
}

pub async fn token(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Token, AppError> {
    let MakeToken { space_id, user_id } = parse_query::<MakeToken>(req.uri()).unwrap_or_default();
    let session = authenticate_optional(ctx, &req).await?;
    match (session, user_id) {
        (Some(session), Some(user_id)) => {
            if session.user_id != user_id {
                tracing::warn!(
                    event = "websocket.identity_mismatch",
                    session_user_id = %session.user_id,
                    user_id = %user_id,
                    space_id = ?space_id,
                    "User ID does not match the authenticated user"
                );
                metrics::counter!("boluo_server_events_token_user_id_mismatch_total").increment(1);
                Err(AppError::Unauthenticated(AuthenticateFail::Guest))
            } else {
                Ok(Token {
                    token: super::token::TOKEN_STORE.create_token(Some(session)),
                    issued_at: timestamp(),
                })
            }
        }
        (None, Some(user_id)) => {
            tracing::warn!(
                event = "events.token.user_without_session",
                user_id = %user_id,
                space_id = ?space_id,
                "No session found for the user, but 'user_id' is provided"
            );
            Err(AppError::Unauthenticated(AuthenticateFail::NoSessionFound))
        }
        (session, None) => Ok(Token {
            token: super::token::TOKEN_STORE.create_token(session),
            issued_at: timestamp(),
        }),
    }
}

async fn sse(ctx: &crate::context::AppContext, req: Request<Incoming>) -> Response {
    use hyper::{StatusCode, header};

    let query = match parse_query::<UpdateQuery>(req.uri()) {
        Ok(q) => q,
        Err(e) => return err_response(e),
    };

    let UpdateQuery {
        mailbox,
        token: _,
        after,
        seq,
        node,
        encoding: _,
        user_id,
    } = query;

    let session = match authenticate_optional(ctx, &req).await {
        Ok(s) => s,
        Err(e) => return err_response(e),
    };

    if let Err(error) = check_space_permissions(ctx, mailbox, session.as_ref()).await {
        return err_response(error);
    }

    if let Some(uid) = user_id {
        if session.is_none() || session.as_ref().map(|s| s.user_id) != Some(uid) {
            return err_response(AppError::Unauthenticated(AuthenticateFail::NoSessionFound));
        }
    }

    let mut messages: Vec<tungstenite::Utf8Bytes> = Vec::new();

    messages.push(Update::app_info().encode());

    match Update::get_from_state(&mailbox, after, seq, node).await {
        Ok(mut cached) => {
            messages.append(&mut cached);
            messages.push(Update::initialized(mailbox).encode());
        }
        Err(GetFromStateError::FailedToQuery) => {
            let error_update = Update::error(mailbox, ConnectionError::Unexpected).encode();
            messages.push(error_update);
            messages.push(Update::initialized(mailbox).encode());
        }
        Err(GetFromStateError::RequestedUpdatesAreTooEarly { start_at: _ }) => {
            let error_update = Update::error(mailbox, ConnectionError::CursorTooOld).encode();
            messages.push(error_update);
        }
    }

    let mut body: Vec<u8> = Vec::new();
    for msg in messages {
        body.extend_from_slice(b"data: ");
        body.extend_from_slice(msg.as_bytes());
        body.extend_from_slice(b"\n\n");
    }

    hyper::Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/event-stream")
        .header(header::CACHE_CONTROL, "no-cache")
        .body(body)
        .expect("Failed to build SSE response")
}

async fn receive_events(ctx: &crate::context::AppContext, req: Request<Incoming>) -> Response {
    let query = match parse_query::<UpdateQuery>(req.uri()) {
        Ok(q) => q,
        Err(e) => return err_response(e),
    };
    let mailbox = query.mailbox;

    let session = match authenticate_optional(ctx, &req).await {
        Ok(s) => s,
        Err(e) => return err_response(e),
    };

    if let Err(error) = check_space_permissions(ctx, mailbox, session.as_ref()).await {
        return err_response(error);
    }

    let body_bytes = match crate::interface::read_body_limited(
        req,
        crate::interface::DEFAULT_JSON_BODY_LIMIT_BYTES,
    )
    .await
    {
        Ok(body) => body,
        Err(error) => return err_response(error),
    };
    let body_str = match std::str::from_utf8(&body_bytes) {
        Ok(s) => s,
        Err(_) => {
            return err_response(AppError::BadRequest(
                "Request body is not valid UTF-8".to_string(),
            ));
        }
    };

    let (error_sender, _error_receiver) = tokio::sync::mpsc::channel(1);

    handle_client_event(ctx, mailbox, error_sender, session, body_str.into()).await;

    ok_response(serde_json::json!({ "ok": true }))
}

pub async fn router(
    ctx: &crate::context::AppContext,
    req: Request<Incoming>,
    path: &str,
) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/connect", Method::GET) => Ok(connect(ctx, req).await),
        ("/sse", Method::GET) => Ok(sse(ctx, req).await),
        ("/sse/receive", Method::POST) => Ok(receive_events(ctx, req).await),
        ("/token", Method::GET) => token(ctx, req).await.map(ok_response),
        _ => missing(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

    #[test]
    fn websocket_close_codes_use_bounded_groups() {
        assert_eq!(websocket_close_code_group(1000), "normal");
        assert_eq!(websocket_close_code_group(1001), "standard");
        assert_eq!(websocket_close_code_group(2999), "standard");
        assert_eq!(websocket_close_code_group(3000), "application");
        assert_eq!(websocket_close_code_group(4000), "application");
        assert_eq!(websocket_close_code_group(4999), "application");
        assert_eq!(websocket_close_code_group(999), "invalid");
        assert_eq!(websocket_close_code_group(5000), "invalid");
    }

    #[tokio::test]
    async fn polling_split_stream_sends_queued_close_reply() {
        use tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode;
        use tokio_tungstenite::tungstenite::protocol::{CloseFrame, Role};

        let (client_io, server_io) = tokio::io::duplex(1024);
        let (mut client, server) = tokio::join!(
            WebSocketStream::from_raw_socket(client_io, Role::Client, None),
            WebSocketStream::from_raw_socket(server_io, Role::Server, None),
        );
        let (_server_outgoing, mut server_incoming) = server.split();
        let close_frame = CloseFrame {
            code: CloseCode::Normal,
            reason: Utf8Bytes::from_static("CHAT_CONTEXT_DISPOSED"),
        };

        client
            .send(WsMessage::Close(Some(close_frame.clone())))
            .await
            .unwrap();
        assert_eq!(
            futures::StreamExt::next(&mut server_incoming)
                .await
                .unwrap()
                .unwrap(),
            WsMessage::Close(Some(close_frame.clone()))
        );

        let client_reply = tokio::spawn(async move {
            futures::StreamExt::next(&mut client)
                .await
                .unwrap()
                .unwrap()
        });
        let server_closed = tokio::time::timeout(
            Duration::from_secs(1),
            futures::StreamExt::next(&mut server_incoming),
        )
        .await
        .unwrap();
        assert!(matches!(
            server_closed,
            None | Some(Err(tungstenite::Error::ConnectionClosed))
        ));
        assert_eq!(
            client_reply.await.unwrap(),
            WsMessage::Close(Some(close_frame))
        );
    }

    fn decompress_cached_updates(payload: &[u8], encoding: UpdateEncoding) -> Vec<u8> {
        let mut decompressed = Vec::new();
        match encoding {
            UpdateEncoding::Plain => return payload.to_vec(),
            UpdateEncoding::Gzip => {
                flate2::read::GzDecoder::new(payload)
                    .read_to_end(&mut decompressed)
                    .expect("gzip payload should decompress");
            }
            UpdateEncoding::Brotli => {
                brotli::Decompressor::new(payload, 4096)
                    .read_to_end(&mut decompressed)
                    .expect("brotli payload should decompress");
            }
        }
        decompressed
    }

    #[test]
    fn cached_update_chunks_are_limited_by_serialized_bytes() {
        let updates = [
            Utf8Bytes::from_static("1234"),
            Utf8Bytes::from_static("5678"),
            Utf8Bytes::from_static("90"),
        ];

        // The newline delimiter between updates is part of the serialized payload.
        assert_eq!(cached_updates_chunk_len(&updates, 9), 2);
        assert_eq!(cached_updates_chunk_len(&updates, 8), 1);
        assert_eq!(cached_updates_chunk_len(&updates[1..], 7), 2);
    }

    #[test]
    fn oversized_cached_update_gets_its_own_chunk() {
        let updates = [
            Utf8Bytes::from_static("oversized"),
            Utf8Bytes::from_static("next"),
        ];

        assert_eq!(cached_updates_chunk_len(&updates, 4), 1);
        assert_eq!(cached_updates_chunk_len(&[], 4), 0);
    }

    #[tokio::test]
    async fn compressed_update_chunk_preserves_serialized_updates() {
        let updates = [
            Utf8Bytes::from_static(r#"{"type":"FIRST"}"#),
            Utf8Bytes::from_static(r#"{"type":"SECOND"}"#),
        ];
        let expected = serialize_cached_updates(&updates);

        for encoding in [
            UpdateEncoding::Plain,
            UpdateEncoding::Gzip,
            UpdateEncoding::Brotli,
        ] {
            let compressed = compress_cached_updates(&updates, encoding)
                .await
                .expect("updates should compress");
            assert_eq!(decompress_cached_updates(&compressed, encoding), expected);
        }
    }
}
