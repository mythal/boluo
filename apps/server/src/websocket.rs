use crate::error::AppError;
use crate::interface::Response;
use crate::utils::sha1;
use hyper::body::Incoming;
use hyper::header::{CONNECTION, HeaderMap, HeaderValue, SEC_WEBSOCKET_KEY, UPGRADE};
use hyper::upgrade::Upgraded;
use hyper_util::rt::TokioIo;
use std::future::Future;
use tokio_tungstenite::WebSocketStream;
pub use tokio_tungstenite::tungstenite::{Error as WsError, Message as WsMessage};

pub fn check_websocket_header(headers: &HeaderMap) -> Result<HeaderValue, AppError> {
    use base64::{Engine as _, engine::general_purpose::STANDARD as base64_engine};

    tracing::trace!("Checking Websocket request header: {:?}", headers);
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
        tracing::error!("Can't find \"upgrade\"");
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
    use hyper::{StatusCode, header};
    use tokio_tungstenite::tungstenite::protocol::Role;

    // Extract connection info for tracing
    let connection_id = uuid::Uuid::new_v4();
    let user_agent = req
        .headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    let Ok(accept) = check_websocket_header(req.headers()) else {
        tracing::warn!(
            connection_id = %connection_id,
            user_agent = %user_agent,
            "Invalid websocket header"
        );
        return hyper::Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body(Vec::new())
            .unwrap_or_default();
    };

    tokio::spawn(async move {
        // Create a long-lived span for this WebSocket connection
        let span = tracing::info_span!(
            "websocket_connection",
            connection_id = %connection_id,
            user_agent = %user_agent,
            duration_ms = tracing::field::Empty,
            messages_sent = tracing::field::Empty,
            messages_received = tracing::field::Empty,
            close_reason = tracing::field::Empty,
        );

        let _guard = span.enter();
        let start_time = std::time::Instant::now();

        match hyper::upgrade::on(req).await {
            Ok(upgraded) => {
                let upgraded = TokioIo::new(upgraded);
                let ws_stream = tokio_tungstenite::WebSocketStream::from_raw_socket(
                    upgraded,
                    Role::Server,
                    None,
                )
                .await;

                tracing::info!("WebSocket connection established");

                // Run the handler within this span context
                handler(ws_stream).await;

                span.record("duration_ms", start_time.elapsed().as_millis() as u64);
                span.record("close_reason", "normal");
                tracing::info!("WebSocket connection closed normally");
            }
            Err(e) => {
                span.record("duration_ms", start_time.elapsed().as_millis() as u64);
                span.record("close_reason", "upgrade_failed");
                tracing::error!(error = %e, "Failed to upgrade connection");
            }
        }
    });

    hyper::Response::builder()
        .status(StatusCode::SWITCHING_PROTOCOLS)
        .header(header::UPGRADE, "websocket")
        .header(header::CONNECTION, "Upgrade")
        .header(header::SEC_WEBSOCKET_ACCEPT, accept)
        .body(Vec::new())
        .unwrap_or_else(|err| {
            tracing::error!(error = %err, "Failed to build websocket response");
            hyper::Response::default()
        })
}
