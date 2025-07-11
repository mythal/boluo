use super::Update;
use super::api::Token;
use super::types::{Seq, UpdateQuery};
use crate::csrf::authenticate_optional;
use crate::db;
use crate::error::{AppError, Find};
use crate::events::api::MakeToken;
use crate::events::get_mailbox_broadcast_rx;
use crate::events::models::StatusKind;
use crate::events::types::{ClientEvent, GetFromStateError};
use crate::interface::{Response, missing, ok_response, parse_query};
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
    after: Option<i64>,
    seq: Option<Seq>,
    node: Option<u16>,
) -> Result<(), PushUpdatesError> {
    let mut mailbox_rx = get_mailbox_broadcast_rx(mailbox);

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
    for message in cached_updates {
        outgoing.feed(WsMessage::Text(message)).await?;
    }
    let initialized = Update::initialized(mailbox).encode();
    outgoing.feed(WsMessage::Text(initialized)).await?;
    outgoing.flush().await?;

    let mut last_pending_updates_warned = 0;

    loop {
        tokio::select! {
            _ = tokio::time::sleep(Duration::from_secs(8)) => {
                outgoing.send(WsMessage::Text(tungstenite::Utf8Bytes::from_static("♥"))).await?;
            }
            message = mailbox_rx.recv() => {
                let pending = mailbox_rx.len();
                if pending > 64 && (pending - last_pending_updates_warned) > 4 {
                    tracing::info!(pending, "Too many pending updates");
                    last_pending_updates_warned = pending;
                }
                let first_message = message?;
                outgoing.feed(WsMessage::Text(first_message)).await?;
                loop {
                    use tokio::sync::broadcast::error::{TryRecvError, RecvError};
                    match mailbox_rx.try_recv() {
                        Ok(message) => outgoing.feed(WsMessage::Text(message)).await?,
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

#[instrument(skip(session, message))]
async fn handle_client_event(mailbox: Uuid, session: Option<Session>, message: &str) {
    let event = match serde_json::from_str(message) {
        Ok(event) => event,
        Err(parse_error) => {
            tracing::warn!(error = %parse_error, "Failed to parse event from client");
            return;
        }
    };
    match event {
        ClientEvent::Preview { preview } => {
            let Some(session) = session else {
                tracing::warn!("An user tried to preview without authentication");
                return;
            };
            if let Err(err) = preview.broadcast(mailbox, session.user_id).await {
                tracing::warn!("Failed to broadcast preview update: {}", err);
            };
        }
        ClientEvent::Diff { preview } => {
            let Some(session) = session else {
                tracing::warn!("An user tried to diff preview without authentication");
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

async fn connect(req: hyper::Request<Incoming>) -> Response {
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
            Ok(session) => session,
            Err(AppError::Unauthenticated(AuthenticateFail::Guest)) => None,
            Err(e) => return connection_error(req, Some(mailbox), e),
        }
    };
    {
        let pool = db::get().await;
        let mut conn = match pool.acquire().await {
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
            if let Err(e) = check_permissions(&mut conn, space, &session).await {
                return connection_error(req, Some(mailbox), e);
            }
        }
    };

    if let Some(user_id) = user_id {
        if session.is_none() {
            tracing::warn!(
                user_id = %user_id,
                "No session found for the user, but 'user_id' is provided"
            );
            return connection_error(
                req,
                Some(mailbox),
                AppError::Unauthenticated(AuthenticateFail::NoSessionFound),
            );
        }
        if session.as_ref().map(|s| s.user_id) != Some(user_id) {
            tracing::error!(
                session_user_id = %session.as_ref().map(|s| s.user_id).unwrap_or_default(),
                user_id = %user_id,
                "User ID does not match the authenticated user"
            );
            return connection_error(
                req,
                Some(mailbox),
                AppError::Unauthenticated(AuthenticateFail::NoSessionFound),
            );
        }
    }

    establish_web_socket(req, move |ws_stream| async move {
        let (mut outgoing, incoming) = ws_stream.split();

        static BASIC_INFO: std::sync::LazyLock<Utf8Bytes> =
            std::sync::LazyLock::new(|| serde_json::to_string(&Update::app_info()).unwrap().into());
        if let Err(e) = outgoing.send(WsMessage::Text(BASIC_INFO.clone())).await {
            tracing::warn!(error = %e, "Failed to send basic info");
        }
        let push_updates_future = async move {
            use tokio_tungstenite::tungstenite::Error::{AlreadyClosed, ConnectionClosed};
            match push_updates(mailbox, &mut outgoing, after, seq, node).await {
                Ok(_) => tracing::debug!("Stop push updates"),
                Err(PushUpdatesError::FailedToSendMessage(ConnectionClosed | AlreadyClosed)) => {
                    tracing::debug!("Connection closed")
                }
                Err(e) => tracing::warn!(error = %e, "Failed to push updates"),
            }
            outgoing.close().await.ok();
        };

        let receive_client_events = incoming
            .timeout(Duration::from_secs(40))
            .map_err(|_| {
                tungstenite::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::TimedOut,
                    "WebSocket read timeout",
                ))
            })
            .and_then(future::ready)
            .try_for_each(|message: WsMessage| async move {
                if let WsMessage::Text(message) = message {
                    if message == "♡" {
                        return Ok(());
                    }
                    handle_client_event(mailbox, session, &message).await;
                }
                Ok(())
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
                tracing::debug!("Reset without closing handshake");
            }
            future::Either::Right((Err(tungstenite::Error::Io(ref io_err)), _))
                if io_err.kind() == std::io::ErrorKind::TimedOut =>
            {
                tracing::debug!("WebSocket read timeout after 40 seconds");
            }
            future::Either::Right((Err(tungstenite::Error::ConnectionClosed), _)) => {
                tracing::debug!("WebSocket connection closed normally");
            }
            future::Either::Right((Err(tungstenite::Error::AlreadyClosed), _)) => {
                tracing::warn!("Attempted to operate on already closed WebSocket connection");
            }
            future::Either::Right((Err(e), _)) => {
                tracing::warn!(error = %e, "Failed to receive events");
            }
            future::Either::Right((Ok(_), _)) => {
                tracing::debug!("Stop receiving events");
            }
        }
        if let Some(session) = session {
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
                Err(AppError::Unauthenticated(AuthenticateFail::Guest))
            } else {
                Ok(Token {
                    token: super::token::TOKEN_STORE.create_token(Some(session)),
                })
            }
        }
        (None, Some(user_id)) => {
            tracing::warn!(
                user_id = %user_id,
                space_id = ?space_id,
                "No session found for the user, but user_id is provided"
            );
            Err(AppError::Unauthenticated(AuthenticateFail::NoSessionFound))
        }
        (session, None) => Ok(Token {
            token: super::token::TOKEN_STORE.create_token(session),
        }),
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
