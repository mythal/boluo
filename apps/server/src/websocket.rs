use crate::error::AppError;
use crate::interface::Response;
use crate::utils::sha1;
use hyper::body::{Body, Incoming};
use hyper::header::{HeaderMap, HeaderValue, CONNECTION, SEC_WEBSOCKET_KEY, UPGRADE};
use hyper::upgrade::Upgraded;
use hyper_util::rt::TokioIo;
use std::future::Future;
pub use tokio_tungstenite::tungstenite::{Error as WsError, Message as WsMessage};
use tokio_tungstenite::WebSocketStream;

pub fn check_websocket_header(headers: &HeaderMap) -> Result<HeaderValue, AppError> {
    use base64::{engine::general_purpose::STANDARD as base64_engine, Engine as _};

    log::trace!("Checking Websocket request header: {:?}", headers);
    let upgrade = headers
        .get(UPGRADE)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::BadRequest(String::new()))?;
    if upgrade.trim() != "websocket" {
        return Err(AppError::BadRequest(String::new()));
    }
    let connection = headers
        .get(CONNECTION)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::BadRequest("Missing the \"Connection\" header".to_string()))?;

    if !connection.contains("Upgrade") && !connection.contains("upgrade") {
        log::error!("Can't find \"upgrade\"");
    }
    let mut key = headers
        .get(SEC_WEBSOCKET_KEY)
        .and_then(|key| key.to_str().ok())
        .ok_or_else(|| AppError::BadRequest("Failed to read ws key from headers".to_string()))?
        .to_string();
    key.push_str("258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    let accept = base64_engine.encode(sha1(key.as_bytes()).as_ref());
    HeaderValue::from_str(&accept).map_err(error_unexpected!())
}

pub fn establish_web_socket<H, F>(req: hyper::Request<Incoming>, handler: H) -> Response
where
    H: FnOnce(WebSocketStream<TokioIo<Upgraded>>) -> F,
    H: Send + 'static,
    F: Future<Output = ()> + Send,
{
    use hyper::{header, StatusCode};
    use tokio_tungstenite::tungstenite::protocol::Role;
    let Ok(accept) = check_websocket_header(req.headers()) else {
        log::warn!("Invalid websocket header");
        return hyper::Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body(Vec::new())
            .unwrap_or_default();
    };
    tokio::spawn(async {
        match hyper::upgrade::on(req).await {
            Ok(upgraded) => {
                let upgraded = TokioIo::new(upgraded);
                let ws_stream = tokio_tungstenite::WebSocketStream::from_raw_socket(upgraded, Role::Server, None).await;
                handler(ws_stream).await;
                log::debug!("WebSocket connection established");
            }
            Err(e) => {
                log::error!("Failed to upgrade connection: {}", e);
            }
        }
        log::debug!("WebSocket disconnected");
    });
    hyper::Response::builder()
        .status(StatusCode::SWITCHING_PROTOCOLS)
        .header(header::UPGRADE, "websocket")
        .header(header::CONNECTION, "Upgrade")
        .header(header::SEC_WEBSOCKET_ACCEPT, accept)
        .body(Vec::new())
        .unwrap_or_else(|err| {
            log::error!("Failed to build websocket response {}", err);
            hyper::Response::default()
        })
}
