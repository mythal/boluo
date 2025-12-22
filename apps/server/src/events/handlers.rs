use super::Update;
use super::api::Token;
use super::types::{Seq, UpdateQuery};
use crate::csrf::authenticate_optional;
use crate::error::{AppError, Find};
use crate::events::api::MakeToken;
use crate::events::get_mailbox_broadcast_rx;
use crate::events::models::StatusKind;
use crate::events::token::SessionError;
use crate::events::types::{ClientEvent, GetFromStateError};
use crate::interface::{Response, err_response, missing, ok_response, parse_query};
use crate::session::{AuthenticateFail, Session};
use crate::spaces::{Space, SpaceMember};
use crate::utils::timestamp;
use crate::websocket::{WsMessage, establish_web_socket};
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt, TryStreamExt};
use hyper::Request;
use hyper::body::{Body, Incoming};
use hyper::upgrade::Upgraded;
use hyper_util::rt::TokioIo;
use std::time::Duration;
use thiserror::Error;
use tokio_stream::StreamExt as _;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::tungstenite::{self, Utf8Bytes};
use tracing::instrument;
use uuid::Uuid;

type Sender = SplitSink<WebSocketStream<TokioIo<Upgraded>>, tungstenite::Message>;

async fn check_permissions(
    db: &mut sqlx::PgConnection,
    space: &Space,
    session: &Option<Session>,
) -> Result<(), AppError> {
    if space.is_public || space.allow_spectator {
        return Ok(());
    }
    match session {
        Some(session) => {
            if space.owner_id == session.user_id {
                return Ok(());
            }
            SpaceMember::get(&mut *db, &session.user_id, &space.id)
                .await
                .or_no_permission()?;
        }
        None => {
            tracing::warn!(
                space_id = %space.id,
                "A user tried to access private space but did not pass authentication"
            );
            return Err(AppError::NoPermission(
                "This space does not allow non-members to view it.".to_string(),
            ));
        }
    }
    Ok(())
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

// Allow the needless return for keep some visual hints
#[allow(clippy::needless_return)]
#[instrument(skip(outgoing))]
async fn push_updates(
    mailbox: Uuid,
    outgoing: &mut Sender,
    mut error_receiver: tokio::sync::mpsc::Receiver<AppError>,
    after: Option<i64>,
    seq: Option<Seq>,
    node: Option<u16>,
) -> Result<(), PushUpdatesError> {
    let mut mailbox_rx = get_mailbox_broadcast_rx(mailbox);
    let start_time = std::time::Instant::now();

    let cached_updates = match Update::get_from_state(&mailbox, after, seq, node).await {
        Ok(updates) => updates,
        Err(GetFromStateError::FailedToQuery) => {
            tracing::error!(
                mailbox_id = %mailbox,
                "Failed to get cached updates"
            );
            let error_update = Update::error(
                mailbox,
                AppError::Unexpected(anyhow::anyhow!("Failed to get cached updates")),
            )
            .encode();
            outgoing.send(WsMessage::Text(error_update)).await?;
            return Err(PushUpdatesError::FailedToGetCachedUpdates);
        }
        Err(GetFromStateError::RequestedUpdatesAreTooEarly { start_at }) => {
            let elapsed = timestamp() - after.unwrap_or(0);
            metrics::histogram!(
                "boluo_server_events_push_updates_requested_updates_are_too_early_duration_ms"
            )
            .record(elapsed as f64);
            tracing::info!(
                mailbox_id = %mailbox,
                after,
                seq,
                node,
                start_at,
                elapsed,
                "The user requested updates with 'after', but the cached updates are too new"
            );

            vec![]
        }
    };
    let cached_updates_count = cached_updates.len();
    for message in cached_updates {
        outgoing.feed(WsMessage::Text(message)).await?;
    }
    let initialized = Update::initialized(mailbox).encode();
    outgoing.feed(WsMessage::Text(initialized)).await?;
    outgoing.flush().await?;

    metrics::histogram!("boluo_server_events_push_initial_updates_duration_ms")
        .record(start_time.elapsed().as_millis() as f64);
    metrics::histogram!("boluo_server_events_push_initial_updates_count")
        .record(cached_updates_count as f64);

    let mut last_pending_updates_warned = 0;
    let pending_updates = metrics::histogram!("boluo_server_events_pending_updates");
    let events_sent_counter = metrics::counter!("boluo_server_events_events_sent_total");

    loop {
        tokio::select! {
            _ = tokio::time::sleep(Duration::from_secs(8)) => {
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
    pool: &sqlx::PgPool,
    mailbox: Uuid,
    error_sender: tokio::sync::mpsc::Sender<AppError>,
    session: Option<Session>,
    message: Utf8Bytes,
) {
    let Ok(deserialize_result) =
        tokio::task::spawn_blocking(move || serde_json::from_str::<ClientEvent>(&message)).await
    else {
        tracing::warn!("Failed to parse event from client");
        error_sender
            .send(AppError::BadRequest(
                "Failed to parse event from client".to_string(),
            ))
            .await
            .ok();
        return;
    };
    let event = match deserialize_result {
        Ok(event) => event,
        Err(e) => {
            tracing::warn!(error = %e, "Failed to parse event from client");
            error_sender
                .send(AppError::BadRequest(
                    "Failed to parse event from client".to_string(),
                ))
                .await
                .ok();
            return;
        }
    };
    match event {
        ClientEvent::Preview { preview } => {
            let Some(session) = session else {
                tracing::warn!("An user tried to preview without authentication");
                metrics::counter!("boluo_server_events_preview_without_authentication_total")
                    .increment(1);

                error_sender
                    .send(AppError::Unauthenticated(AuthenticateFail::Guest))
                    .await
                    .ok();

                return;
            };
            metrics::counter!("boluo_server_events_preview_total").increment(1);
            if let Err(err) = preview.broadcast(pool, mailbox, session.user_id).await {
                tracing::warn!("Failed to broadcast preview update: {}", err);
            };
        }
        ClientEvent::Diff { preview } => {
            let Some(session) = session else {
                tracing::warn!("An user tried to diff preview without authentication");
                error_sender
                    .send(AppError::Unauthenticated(AuthenticateFail::Guest))
                    .await
                    .ok();

                return;
            };
            if let Err(err) = preview.broadcast(mailbox, session.user_id).await {
                tracing::warn!(error = %err, "Failed to broadcast preview diff update");
            }
        }
        ClientEvent::Status { kind, focus } => {
            if let Some(session) = session {
                if let Err(err) =
                    Update::status(mailbox, session.user_id, kind, timestamp(), focus).await
                {
                    tracing::warn!("Failed to broadcast status update: {}", err);
                }
            }
        }
    }
}

fn connection_error(req: Request<Incoming>, mailbox: Option<Uuid>, error: AppError) -> Response {
    let mailbox = mailbox.unwrap_or_default();
    tracing::error!(error = %error, "WebSocket connection error");
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
        tracing::warn!("Failed to parse query {:?}", req.uri());
        return connection_error(
            req,
            None,
            AppError::BadRequest("Failed to parse query".to_string()),
        );
    };
    use futures::future;
    let UpdateQuery {
        mailbox,
        token,
        after,
        seq,
        node,
        user_id,
    } = query;

    let session = if let Some(token) = token {
        super::token::TOKEN_STORE.get_session(token)
    } else {
        match authenticate_optional(&req).await {
            Ok(Some(session)) => Ok(session),
            Ok(None) => Err(SessionError::Invalid),
            Err(AppError::Unauthenticated(AuthenticateFail::Guest)) => Err(SessionError::Invalid),
            Err(e) => return connection_error(req, Some(mailbox), e),
        }
    };
    {
        let mut conn = match ctx.db.acquire().await {
            Ok(conn) => conn,
            Err(e) => {
                tracing::error!(error = %e, "Failed to acquire database connection");
                return connection_error(req, Some(mailbox), e.into());
            }
        };
        let space = match Space::get_by_id(&mut *conn, &mailbox).await {
            Ok(space) => space,
            Err(e) => {
                tracing::error!(error = %e, "Failed to get space");
                return connection_error(req, Some(mailbox), e.into());
            }
        };

        if let Some(space) = space.as_ref() {
            if let Err(e) = check_permissions(&mut conn, space, &session.ok()).await {
                return connection_error(req, Some(mailbox), e);
            }
        }
    };

    if let Some(user_id) = user_id {
        match &session {
            Err(SessionError::Expired) => {
                tracing::warn!(
                    user_id = %user_id,
                    mailbox_id = %mailbox,
                    user_agent,
                    origin,
                    "The connection token has expired for the user"
                );
                return connection_error(
                    req,
                    Some(mailbox),
                    AppError::Unauthenticated(AuthenticateFail::Expired),
                );
            }
            Err(SessionError::Invalid) => {
                tracing::warn!(
                    user_id = %user_id,
                    mailbox_id = %mailbox,
                    user_agent,
                    origin,
                    "Cannot find session of the user from the provided token"
                );
                return connection_error(
                    req,
                    Some(mailbox),
                    AppError::Unauthenticated(AuthenticateFail::NoSessionFound),
                );
            }
            Ok(session) => {
                if session.user_id != user_id {
                    tracing::error!(
                        session_user_id = %session.user_id,
                        user_id = %user_id,
                        mailbox_id = %mailbox,
                        user_agent,
                        origin,
                        "User ID does not match the authenticated user"
                    );
                    return connection_error(
                        req,
                        Some(mailbox),
                        AppError::Unauthenticated(AuthenticateFail::NoSessionFound),
                    );
                }
            }
        }
    }

    let pool = ctx.db.clone();
    establish_web_socket(req, move |ws_stream| async move {
        let (mut outgoing, incoming) = ws_stream.split();
        let (error_sender, error_receiver) = tokio::sync::mpsc::channel(1);

        static BASIC_INFO: std::sync::LazyLock<Utf8Bytes> =
            std::sync::LazyLock::new(|| serde_json::to_string(&Update::app_info()).unwrap().into());
        if let Err(e) = outgoing.send(WsMessage::Text(BASIC_INFO.clone())).await {
            tracing::warn!(error = %e, "Failed to send basic info");
        }
        let push_updates_future = async move {
            use tokio_tungstenite::tungstenite::Error::{AlreadyClosed, ConnectionClosed};
            match push_updates(mailbox, &mut outgoing, error_receiver, after, seq, node).await {
                Ok(_) => tracing::debug!("Stop push updates"),
                Err(PushUpdatesError::FailedToSendMessage(ConnectionClosed | AlreadyClosed)) => {
                    metrics::counter!("boluo_server_events_push_updates_connection_closed_total")
                        .increment(1);
                    tracing::debug!("Connection closed")
                }
                Err(e) => tracing::warn!(error = %e, "Failed to push updates"),
            }
            outgoing.close().await.ok();
        };

        let pool = pool.clone();
        let receive_client_events = incoming
            .timeout(Duration::from_secs(40))
            .map_err(|_| {
                tungstenite::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::TimedOut,
                    "WebSocket read timeout",
                ))
            })
            .and_then(future::ready)
            .try_for_each(|message: WsMessage| {
                let error_sender = error_sender.clone();
                async {
                    if let WsMessage::Text(message) = message {
                        if message == "♡" {
                            return Ok(());
                        }
                        handle_client_event(&pool, mailbox, error_sender, session.ok(), message)
                            .await
                    }
                    Ok(())
                }
            });
        futures::pin_mut!(push_updates_future);
        futures::pin_mut!(receive_client_events);
        let select_result = future::select(push_updates_future, receive_client_events).await;
        match select_result {
            future::Either::Left((_, _)) => {
                tracing::debug!("Stop push updates");
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
                tracing::debug!("Reset without closing handshake");
            }
            future::Either::Right((Err(tungstenite::Error::Io(ref io_err)), _))
                if io_err.kind() == std::io::ErrorKind::TimedOut =>
            {
                metrics::counter!("boluo_server_events_push_updates_read_timeout_total")
                    .increment(1);
                tracing::debug!("WebSocket read timeout after 40 seconds");
            }
            future::Either::Right((Err(tungstenite::Error::ConnectionClosed), _)) => {
                metrics::counter!("boluo_server_events_push_updates_connection_closed_total")
                    .increment(1);
                tracing::debug!("WebSocket connection closed normally");
            }
            future::Either::Right((Err(tungstenite::Error::AlreadyClosed), _)) => {
                metrics::counter!("boluo_server_events_push_updates_already_closed_total")
                    .increment(1);
                tracing::warn!("Attempted to operate on already closed WebSocket connection");
            }
            future::Either::Right((Err(e), _)) => {
                metrics::counter!(
                    "boluo_server_events_push_updates_failed_to_receive_events_total"
                )
                .increment(1);
                tracing::warn!(error = %e, "Failed to receive events");
            }
            future::Either::Right((Ok(_), _)) => {
                tracing::debug!("Stop receiving events");
            }
        }
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
                    tracing::warn!("Failed to broadcast offline status: {}", e);
                }
            }
        }
    })
}

pub async fn token(req: Request<impl Body>) -> Result<Token, AppError> {
    let MakeToken { space_id, user_id } = parse_query::<MakeToken>(req.uri()).unwrap_or_default();
    let session = authenticate_optional(&req).await?;
    match (session, user_id) {
        (Some(session), Some(user_id)) => {
            if session.user_id != user_id {
                tracing::warn!(
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
                })
            }
        }
        (None, Some(user_id)) => {
            use hyper::header::{AUTHORIZATION, COOKIE, ORIGIN, REFERER};

            let origin = req
                .headers()
                .get(ORIGIN)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            let referer = req
                .headers()
                .get(REFERER)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            let authorization = req
                .headers()
                .get(AUTHORIZATION)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            let cookie = req
                .headers()
                .get(COOKIE)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            let user_agent = req
                .headers()
                .get(hyper::header::USER_AGENT)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            tracing::warn!(
                user_id = %user_id,
                space_id = ?space_id,
                origin,
                referer,
                authorization,
                cookie,
                user_agent,
                "No session found for the user, but 'user_id' is provided"
            );
            Err(AppError::Unauthenticated(AuthenticateFail::NoSessionFound))
        }
        (session, None) => Ok(Token {
            token: super::token::TOKEN_STORE.create_token(session),
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
        user_id,
    } = query;

    let session = match authenticate_optional(&req).await {
        Ok(s) => s,
        Err(e) => return err_response(e),
    };

    {
        let mut conn = match ctx.db.acquire().await {
            Ok(c) => c,
            Err(e) => return err_response(e.into()),
        };
        if let Ok(Some(space)) = Space::get_by_id(&mut *conn, &mailbox).await {
            if let Err(e) = check_permissions(&mut conn, &space, &session).await {
                return err_response(e);
            }
        }
    }

    if let Some(uid) = user_id {
        if session.is_none() || session.as_ref().map(|s| s.user_id) != Some(uid) {
            return err_response(AppError::Unauthenticated(AuthenticateFail::NoSessionFound));
        }
    }

    let mut messages: Vec<tungstenite::Utf8Bytes> = Vec::new();

    messages.push(Update::app_info().encode());

    match Update::get_from_state(&mailbox, after, seq, node).await {
        Ok(mut cached) => messages.append(&mut cached),
        Err(GetFromStateError::FailedToQuery) => {
            let error_update = Update::error(
                mailbox,
                AppError::Unexpected(anyhow::anyhow!("Failed to get cached updates")),
            )
            .encode();
            messages.push(error_update);
        }
        Err(GetFromStateError::RequestedUpdatesAreTooEarly { start_at: _ }) => {}
    }

    messages.push(Update::initialized(mailbox).encode());

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
    use http_body_util::BodyExt;

    let query = match parse_query::<UpdateQuery>(req.uri()) {
        Ok(q) => q,
        Err(e) => return err_response(e),
    };
    let mailbox = query.mailbox;

    let session = match authenticate_optional(&req).await {
        Ok(s) => s,
        Err(e) => return err_response(e),
    };

    {
        let mut conn = match ctx.db.acquire().await {
            Ok(c) => c,
            Err(e) => return err_response(e.into()),
        };
        if let Ok(Some(space)) = Space::get_by_id(&mut *conn, &mailbox).await {
            if let Err(e) = check_permissions(&mut conn, &space, &session).await {
                return err_response(e);
            }
        }
    }

    let body_bytes = match req.into_body().collect().await {
        Ok(c) => c.to_bytes(),
        Err(_) => {
            return err_response(AppError::BadRequest(
                "Failed to read the request body".to_string(),
            ));
        }
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

    handle_client_event(&ctx.db, mailbox, error_sender, session, body_str.into()).await;

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
        ("/token", Method::GET) => token(req).await.map(ok_response),
        _ => missing(),
    }
}
