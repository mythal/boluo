use super::api::Token;
use super::types::{Seq, UpdateQuery};
use super::Update;
use crate::csrf::authenticate_optional;
use crate::db;
use crate::error::{AppError, Find};
use crate::events::get_mailbox_broadcast_rx;
use crate::events::models::StatusKind;
use crate::events::types::ClientEvent;
use crate::interface::{missing, ok_response, parse_query, Response};
use crate::session::{AuthenticateFail, Session};
use crate::spaces::{Space, SpaceMember};
use crate::utils::timestamp;
use crate::websocket::{establish_web_socket, WsError, WsMessage};
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt, TryStreamExt};
use hyper::body::{Body, Incoming};
use hyper::upgrade::Upgraded;
use hyper::Request;
use hyper_util::rt::TokioIo;
use std::time::Duration;
use tokio_stream::StreamExt as _;
use tokio_tungstenite::tungstenite::{self, Utf8Bytes};
use tokio_tungstenite::WebSocketStream;
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
            SpaceMember::get(&mut *db, &session.user_id, &space.id)
                .await
                .or_no_permission()?;
        }
        None => {
            log::warn!("A user tried to access private space but did not pass authentication");
            return Err(AppError::NoPermission(
                "This space does not allow non-members to view it.".to_string(),
            ));
        }
    }
    Ok(())
}

// Allow the needless return for keep some visual hints
#[allow(clippy::needless_return)]
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

        let Some(cached_updates) = Update::get_from_state(&mailbox, after, seq, node).await else {
            let error_update = Update::error(
                mailbox,
                AppError::Unexpected(anyhow::anyhow!("Failed to get cached updates")),
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
                Ok(update) => WsMessage::Text(update),
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
            log::debug!("{}", err);
        }
    });

    tokio::select! {
        r = message_sender => { r },
        _ = ping => {},
        r = push => { r },
    }
}

async fn handle_client_event(mailbox: Uuid, session: Option<Session>, message: &str) {
    let event: Result<ClientEvent, _> = serde_json::from_str(message);
    if let Err(event) = event {
        log::warn!("Failed to parse event from client: {}", event);
        return;
    }
    let event = event.unwrap();
    match event {
        ClientEvent::Preview { preview } => {
            let Some(session) = session else {
                log::warn!("An user tried to preview without authentication");
                return;
            };
            if let Err(err) = preview.broadcast(mailbox, session.user_id).await {
                log::warn!("Failed to broadcast preview update: {}", err);
            };
        }
        ClientEvent::Status { kind, focus } => {
            if let Some(session) = session {
                if let Err(err) =
                    Update::status(mailbox, session.user_id, kind, timestamp(), focus).await
                {
                    log::warn!("Failed to broadcast status update: {}", err);
                }
            }
        }
    }
}

fn connection_error(req: Request<Incoming>, mailbox: Option<Uuid>, error: AppError) -> Response {
    let mailbox = mailbox.unwrap_or_default();
    let error_update = Update::error(mailbox, error).encode();
    establish_web_socket(req, |ws_stream| async move {
        let (mut outgoing, _incoming) = ws_stream.split();
        outgoing.send(WsMessage::Text(error_update)).await.ok();
    })
}

async fn connect(req: hyper::Request<Incoming>) -> Response {
    let Ok(query) = parse_query::<UpdateQuery>(req.uri()) else {
        log::warn!("Failed to parse query {:?}", req.uri());
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
        outgoing
            .send(WsMessage::Text(BASIC_INFO.clone()))
            .await
            .ok();
        let push_updates_future = async move {
            push_updates(mailbox, &mut outgoing, after, seq, node).await;
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
        log::debug!("WebSocket connection close");
        match select_result {
            future::Either::Left((_, _)) => {
                log::debug!("Stop push updates");
            }
            future::Either::Right((Err(e), _)) => {
                if let tungstenite::Error::Protocol(
                    tungstenite::error::ProtocolError::ResetWithoutClosingHandshake,
                ) = e
                {
                    log::debug!("Reset without closing handshake");
                } else {
                    log::warn!("Failed to receive events: {}", e);
                }
            }
            future::Either::Right((Ok(_), _)) => {
                log::debug!("Stop receiving events");
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
                    log::warn!("Failed to broadcast offline status: {}", e);
                }
            }
        }
    })
}

pub async fn token(req: Request<impl Body>) -> Result<Token, AppError> {
    let session = authenticate_optional(&req).await?;
    Ok(Token {
        token: super::token::TOKEN_STORE.create_token(session),
    })
}

pub async fn router(req: Request<Incoming>, path: &str) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/connect", Method::GET) => Ok(connect(req).await),
        ("/token", Method::GET) => token(req).await.map(ok_response),
        _ => missing(),
    }
}
