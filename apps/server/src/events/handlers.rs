use super::api::Token;
use super::types::{ConnectionError, EventQuery};
use super::Event;
use crate::csrf::authenticate;
use crate::error::{AppError, Find};
use crate::events::context::get_mailbox_broadcast_rx;
use crate::events::models::StatusKind;
use crate::events::types::ClientEvent;
use crate::interface::{missing, ok_response, parse_query, Response};
use crate::redis::make_key;
use crate::spaces::{Space, SpaceMember};
use crate::utils::timestamp;
use crate::websocket::{establish_web_socket, WsError, WsMessage};
use crate::{db, redis};
use deadpool_redis::redis::AsyncCommands;
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt, TryStreamExt};
use hyper::body::{Body, Incoming};
use hyper::upgrade::Upgraded;
use hyper::Request;
use hyper_util::rt::TokioIo;
use std::time::Duration;
use tokio_stream::StreamExt as _;
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::WebSocketStream;
use uuid::Uuid;

const CHUNK_SIZE: usize = 16;
type Sender = SplitSink<WebSocketStream<TokioIo<Upgraded>>, tungstenite::Message>;

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
async fn push_events(mailbox: Uuid, outgoing: &mut Sender, after: Option<i64>, seq: Option<u16>) {
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
        let mut mailbox_rx = get_mailbox_broadcast_rx(&mailbox).await;

        let cached_events = Event::get_from_cache(&mailbox, after, seq).await;
        if !cached_events.is_empty() {
            use itertools::Itertools;
            let messages: Vec<Result<String, serde_json::Error>> = cached_events
                .into_iter()
                .chunks(CHUNK_SIZE)
                .into_iter()
                .map(|events| Event::batch(mailbox, events.collect()))
                .map(|batch_event| serde_json::to_string(&batch_event))
                .collect();
            for message in messages {
                let Ok(message) = message else {
                    log::warn!("Failed to serialize batch event to mailbox {}", mailbox);
                    return;
                };
                if let Err(err) = tx.send(WsMessage::Text(message)).await {
                    log::warn!("Failed to send batch event to mailbox {}: {}", mailbox, err);
                    return;
                };
            }
        }
        let initialized = Event::initialized(mailbox);
        let initialized =
            serde_json::to_string(&initialized).expect("Failed to serialize initialized event");
        tx.send(WsMessage::Text(initialized)).await.ok();

        loop {
            let message = match mailbox_rx.recv().await {
                Ok(event) => WsMessage::Text(event.encoded.clone()),
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
        if let Err(err) = tx.clone().send(WsMessage::Text("♥".to_string())).await {
            log::warn!("{}", err);
        }
    });

    tokio::select! {
        r = message_sender => { r },
        _ = ping => {},
        r = push => { r },
    }
}

async fn handle_client_event(mailbox: Uuid, user_id: Option<Uuid>, message: String) {
    let event: Result<ClientEvent, _> = serde_json::from_str(&message);
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
                log::warn!("Failed to broadcast preview event: {}", err);
            };
        }
        ClientEvent::Status { kind, focus } => {
            if let Some(user_id) = user_id {
                if let Err(err) = Event::status(mailbox, user_id, kind, timestamp(), focus).await {
                    log::warn!("Failed to broadcast status event: {}", err);
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
    let event = serde_json::to_string(&Event::error(mailbox, code, reason))
        .expect("Failed to serialize error event");
    establish_web_socket(req, |ws_stream| async move {
        let (mut outgoing, _incoming) = ws_stream.split();
        outgoing.send(WsMessage::Text(event)).await.ok();
    })
}

async fn connect(req: hyper::Request<Incoming>) -> Response {
    use futures::future;

    let Ok(EventQuery {
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
        let mut redis = redis::conn().await;
        let key = make_key(b"token", &token, b"user_id");
        let Ok(data) = redis.get::<_, Option<Vec<u8>>>(&key).await else {
            log::warn!("Failed to get token");
            return connection_error(
                req,
                Some(mailbox),
                ConnectionError::InvalidToken,
                "Failed to get token".to_string(),
            );
        };
        if let Some(bytes) = data {
            let Ok(bytes) = bytes.try_into() else {
                log::warn!("Invalid token");
                return connection_error(
                    req,
                    Some(mailbox),
                    ConnectionError::InvalidToken,
                    "Invalid token".to_string(),
                );
            };
            *user_id = Ok(Uuid::from_bytes(bytes));
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

        let server_push_events = async move {
            push_events(mailbox, &mut outgoing, after, seq).await;
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
                    handle_client_event(mailbox, user_id, message).await;
                }
                Ok(())
            });
        futures::pin_mut!(server_push_events);
        futures::pin_mut!(receive_client_events);
        let select_result = future::select(server_push_events, receive_client_events).await;
        log::debug!("WebSocket connection close");
        match select_result {
            future::Either::Left((_, _)) => {
                log::debug!("Stop push events");
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
                Event::status(space.id, user_id, StatusKind::Offline, timestamp(), vec![]).await
            {
                log::warn!("Failed to broadcast offline status: {}", e);
            }
        }
    })
}

pub async fn token(req: Request<impl Body>) -> Result<Token, AppError> {
    if let Ok(session) = authenticate(&req).await {
        let mut redis = redis::conn().await;
        let token = Uuid::new_v4();
        let key = make_key(b"token", &token, b"user_id");
        redis
            .set_ex::<_, _, ()>(&key, session.user_id.as_bytes(), 10)
            .await?;
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
