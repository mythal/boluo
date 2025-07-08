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
use tokio_stream::StreamExt as _;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::tungstenite::{self, Utf8Bytes};
use tracing::instrument;
use uuid::Uuid;

const CHUNK_SIZE: usize = 16;
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

// Allow the needless return for keep some visual hints
#[allow(clippy::needless_return)]
#[instrument(skip(outgoing))]
async fn push_updates(
    mailbox: Uuid,
    outgoing: &mut Sender,
    after: Option<i64>,
    seq: Option<Seq>,
    node: Option<u16>,
) {
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
                    tracing::error!(error = %e, "Error on sending WebSocket message");
                    return;
                }
            }
        }
        return;
    };

    let push = async {
        let mut tx = tx.clone();
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
                tx.send(WsMessage::Text(error_update)).await.ok();
                return;
            }
            Err(GetFromStateError::RequestedUpdatesAreTooEarly) => {
                tracing::info!(
                    mailbox_id = %mailbox,
                    after,
                    "The user requested updates with 'after', but the cached updates are too new"
                );
                let error_update = Update::error(mailbox, AppError::NotFound("Updates")).encode();
                tx.send(WsMessage::Text(error_update)).await.ok();
                return;
            }
        };
        for message in cached_updates {
            if let Err(err) = tx.send(WsMessage::Text(message)).await {
                tracing::warn!(error = %err, "Failed to send initialize updates");
                return;
            };
        }
        let initialized = Update::initialized(mailbox).encode();
        tx.send(WsMessage::Text(initialized)).await.ok();

        loop {
            let message = match mailbox_rx.recv().await {
                Ok(update) => WsMessage::Text(update),
                Err(RecvError::Lagged(lagged)) => {
                    tracing::warn!("lagged {lagged} at {mailbox}");
                    continue;
                }
                Err(RecvError::Closed) => {
                    tracing::error!("mailbox {mailbox} closed");
                    return;
                }
            };
            if let Err(e) = tx.send(message).await {
                tracing::error!(error = %e, "Failed to send broadcast message");
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
            tracing::debug!(error = %err, "Failed to send ping message");
        }
    });

    tokio::select! {
        r = message_sender => { r },
        _ = ping => {},
        r = push => { r },
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
    } = query;
    let mut session = match authenticate_optional(&req).await {
        Ok(session) => session,
        Err(AppError::Unauthenticated(AuthenticateFail::Guest)) => None,
        Err(e) => return connection_error(req, Some(mailbox), e),
    };

    if let (session @ None, Some(token)) = (&mut session, token) {
        *session = super::token::TOKEN_STORE.get_session(token);
    }
    {
        let pool = db::get().await;
        let mut conn = match pool.acquire().await {
            Ok(conn) => conn,
            Err(e) => return connection_error(req, Some(mailbox), e.into()),
        };
        let space = match Space::get_by_id(&mut *conn, &mailbox).await {
            Ok(space) => space,
            Err(e) => return connection_error(req, Some(mailbox), e.into()),
        };

        if let Some(space) = space.as_ref() {
            if let Err(e) = check_permissions(&mut conn, space, &session).await {
                return connection_error(req, Some(mailbox), e);
            }
        }
    };

    establish_web_socket(req, move |ws_stream| async move {
        let (mut outgoing, incoming) = ws_stream.split();

        static BASIC_INFO: std::sync::LazyLock<Utf8Bytes> =
            std::sync::LazyLock::new(|| serde_json::to_string(&Update::app_info()).unwrap().into());
        if let Err(e) = outgoing.send(WsMessage::Text(BASIC_INFO.clone())).await {
            tracing::warn!(error = %e, "Failed to send basic info");
        }
        let push_updates_future = async move {
            push_updates(mailbox, &mut outgoing, after, seq, node).await;
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
