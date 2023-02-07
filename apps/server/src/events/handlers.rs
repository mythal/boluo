use super::api::Token;
use super::types::EventQuery;
use super::Event;
use crate::cache::make_key;
use crate::csrf::authenticate;
use crate::database::Querist;
use crate::error::{AppError, Find};
use crate::events::context::get_mailbox_broadcast_rx;
use crate::events::types::ClientEvent;
use crate::interface::{missing, ok_response, parse_query, Request, Response};
use crate::spaces::models::StatusKind;
use crate::spaces::{Space, SpaceMember};
use crate::utils::timestamp;
use crate::websocket::{establish_web_socket, WsError, WsMessage};
use crate::{cache, database};
use anyhow::anyhow;
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt, TryStreamExt};
use hyper::upgrade::Upgraded;
use std::time::Duration;
use tokio_stream::StreamExt as _;
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::WebSocketStream;
use uuid::Uuid;

type Sender = SplitSink<WebSocketStream<Upgraded>, tungstenite::Message>;

async fn check_permissions<T: Querist>(
    db: &mut T,
    space: &Space,
    user_id: &Result<Uuid, AppError>,
) -> Result<(), AppError> {
    if !space.allow_spectator {
        match user_id {
            Ok(user_id) => {
                SpaceMember::get(db, user_id, &space.id).await.or_no_permission()?;
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
    }
    Ok(())
}

async fn push_events(mailbox: Uuid, outgoing: &mut Sender) -> Result<(), anyhow::Error> {
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
                Err(e) => return Err(e),
            }
        }
        Ok(())
    };

    let push = async {
        let mut tx = tx.clone();
        let mut mailbox_rx = get_mailbox_broadcast_rx(&mailbox).await;

        let cached_events = Event::get_from_cache(&mailbox).await;
        for e in cached_events.into_iter() {
            tx.send(WsMessage::Text(e)).await.ok();
        }
        tx.send(WsMessage::Text(
            serde_json::to_string(&Event::initialized(mailbox)).unwrap(),
        ))
        .await
        .ok();

        loop {
            let message = match mailbox_rx.recv().await {
                Ok(event) => WsMessage::Text(event.encoded.clone()),
                Err(RecvError::Lagged(lagged)) => {
                    log::warn!("lagged {} at {}", lagged, mailbox);
                    continue;
                }
                Err(RecvError::Closed) => return Err(anyhow!("broadcast ({}) is closed.", mailbox)),
            };
            if tx.send(message).await.is_err() {
                break;
            }
        }
        Ok(())
    };

    let ping = IntervalStream::new(interval(Duration::from_secs(3))).for_each(|_| async {
        if let Err(err) = tx.clone().send(WsMessage::Text("♥".to_string())).await {
            log::warn!("{}", err);
        }
    });

    tokio::select! {
        r = message_sender => { r? },
        _ = ping => {},
        r = push => { r? },
    }

    Ok(())
}

async fn handle_client_event(mailbox: Uuid, user_id: Option<Uuid>, message: String) -> Result<(), anyhow::Error> {
    let event: Result<ClientEvent, _> = serde_json::from_str(&message);
    if let Err(event) = event {
        log::debug!("failed to parse event from client: {}", event);
        return Ok(());
    }
    let event = event.unwrap();
    match event {
        ClientEvent::Preview { preview } => {
            let user_id = user_id.ok_or(AppError::NoPermission(
                "You must be logged in to send a Preview.".to_string(),
            ))?;
            preview.broadcast(mailbox, user_id).await?;
        }
        ClientEvent::Status { kind, focus } => {
            if let Some(user_id) = user_id {
                Event::status(mailbox, user_id, kind, timestamp(), focus).await?;
            }
        }
    }
    Ok(())
}

async fn connect(req: Request) -> Result<Response, anyhow::Error> {
    use futures::future;

    let EventQuery { mailbox, token } = parse_query(req.uri())?;

    let mut user_id = authenticate(&req).await.map(|session| session.user_id);
    if let (user_id @ Err(_), Some(token)) = (&mut user_id, token) {
        let mut redis = cache::conn().await;
        let key = make_key(b"token", &token, b"user_id");
        let data = redis.get(&key).await?;
        if let Some(bytes) = data {
            *user_id = Ok(Uuid::from_bytes(
                bytes
                    .try_into()
                    .map_err(|_| anyhow!("can't convert user id in cache to UUID type"))?,
            ))
        }
    }

    let mut conn = database::get().await?;
    let db = &mut *conn;
    let space = Space::get_by_id(db, &mailbox).await?;
    if let Some(space) = space.as_ref() {
        check_permissions(db, space, &user_id).await?;
    }
    let user_id = user_id.ok();
    establish_web_socket(req, move |ws_stream| async move {
        let (mut outgoing, incoming) = ws_stream.split();

        let server_push_events = async move {
            if let Err(e) = push_events(mailbox, &mut outgoing).await {
                log::warn!("Failed to push events: {}", e);
            }
            outgoing.close().await.ok();
        };

        let receive_client_events = incoming
            .timeout(Duration::from_secs(40))
            .map_err(|_| WsError::AlreadyClosed)
            .and_then(future::ready)
            .try_for_each(|message: WsMessage| async move {
                if let WsMessage::Text(message) = message {
                    if message == "♡" {
                        return Ok(());
                    }
                    if let Err(e) = handle_client_event(mailbox, user_id, message).await {
                        log::warn!("Failed to handle the event from client: {}", e);
                    }
                }
                Ok(())
            });
        futures::pin_mut!(server_push_events);
        futures::pin_mut!(receive_client_events);
        future::select(server_push_events, receive_client_events).await;
        log::debug!("WebSocket connection close");
        if let (Some(user_id), Some(space)) = (user_id, space) {
            Event::status(space.id, user_id, StatusKind::Offline, timestamp(), vec![]).await?;
        }
        Ok(())
    })
}

pub async fn token(req: Request) -> Result<Token, AppError> {
    if let Ok(session) = authenticate(&req).await {
        let mut redis = cache::conn().await;
        let token = Uuid::new_v4();
        let key = make_key(b"token", &token, b"user_id");
        redis.set_with_expiration(&key, session.user_id.as_bytes(), 10).await?;
        Ok(Token {
            token: Some(token.to_string()),
        })
    } else {
        Ok(Token { token: None })
    }
}

pub async fn router(req: Request, path: &str) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/connect", Method::GET) => connect(req).await.map_err(|e| {
            e.downcast().unwrap_or_else(|e| {
                log::error!("{}", &e);
                AppError::Unexpected(e)
            })
        }),
        ("/token", Method::GET) => token(req).await.map(ok_response),
        _ => missing(),
    }
}
