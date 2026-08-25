use crate::error::AppError;
use crate::interface::Response;
use crate::utils::sha1;
use hyper::body::Incoming;
use hyper::header::{CONNECTION, HeaderMap, HeaderValue, SEC_WEBSOCKET_KEY, UPGRADE};
use hyper::upgrade::Upgraded;
use hyper_util::rt::TokioIo;
use metrics::{counter, gauge};
use std::future::Future;
use tokio_tungstenite::WebSocketStream;
pub use tokio_tungstenite::tungstenite::Message as WsMessage;
use tokio_tungstenite::tungstenite::protocol::WebSocketConfig;
use tracing::Instrument as _;

const USER_AGENT_LOG_MAX_BYTES: usize = 512;
const WEBSOCKET_BUFFER_BYTES: usize = 16 * 1024;
const WEBSOCKET_MAX_MESSAGE_BYTES: usize = 4 * 1024 * 1024;
const WEBSOCKET_MAX_WRITE_BUFFER_BYTES: usize = 8 * 1024 * 1024;

fn websocket_config() -> WebSocketConfig {
    WebSocketConfig::default()
        .read_buffer_size(WEBSOCKET_BUFFER_BYTES)
        .write_buffer_size(WEBSOCKET_BUFFER_BYTES)
        .max_write_buffer_size(WEBSOCKET_MAX_WRITE_BUFFER_BYTES)
        .max_message_size(Some(WEBSOCKET_MAX_MESSAGE_BYTES))
        .max_frame_size(Some(WEBSOCKET_MAX_MESSAGE_BYTES))
}

pub fn check_websocket_header(headers: &HeaderMap) -> Result<HeaderValue, AppError> {
    use base64::{Engine as _, engine::general_purpose::STANDARD as base64_engine};

    tracing::trace!(
        event = "websocket.headers.check",
        "Checking WebSocket headers"
    );
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
        tracing::error!(
            event = "websocket.header.upgrade_missing",
            "Can't find \"upgrade\""
        );
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
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");
    let user_agent_end = user_agent.floor_char_boundary(USER_AGENT_LOG_MAX_BYTES);
    let user_agent_truncated = user_agent_end < user_agent.len();
    let user_agent = user_agent[..user_agent_end].to_owned();
    let origin = req
        .headers()
        .get(header::ORIGIN)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();
    let Ok(accept) = check_websocket_header(req.headers()) else {
        tracing::warn!(
            event = "websocket.header.invalid",
            connection_id = %connection_id,
            user_agent = %user_agent,
            user_agent_truncated,
            "Invalid websocket header"
        );
        return hyper::Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body(Vec::new())
            .unwrap_or_default();
    };

    // Create a long-lived span for this WebSocket connection
    let span = tracing::info_span!(
        "websocket_connection",
        connection_id = %connection_id,
        duration_ms = tracing::field::Empty,
        origin = %origin,
    );

    tokio::spawn(
        async move {
            let websocket_connections_active = gauge!("boluo_server_websocket_connections_active");
            websocket_connections_active.increment(1);
            counter!("boluo_server_websocket_connections_total").increment(1);
            let start_time = std::time::Instant::now();
            let span = tracing::Span::current();
            match hyper::upgrade::on(req).await {
                Ok(upgraded) => {
                    let upgraded = TokioIo::new(upgraded);
                    let ws_stream = tokio_tungstenite::WebSocketStream::from_raw_socket(
                        upgraded,
                        Role::Server,
                        Some(websocket_config()),
                    )
                    .await;

                    tracing::info!(
                        event = "websocket.connection.established",
                        user_agent = %user_agent,
                        user_agent_truncated,
                        "WebSocket connection established"
                    );
                    // Avoid retaining the header allocation for the connection lifetime.
                    drop(user_agent);

                    // Run the handler within this span context
                    handler(ws_stream).await;

                    span.record("duration_ms", start_time.elapsed().as_millis() as u64);
                    tracing::debug!(
                        event = "websocket.connection.closed",
                        "WebSocket connection closed"
                    );
                }
                Err(e) => {
                    span.record("duration_ms", start_time.elapsed().as_millis() as u64);
                    tracing::error!(
                        event = "websocket.upgrade.failed",
                        error = %e,
                        user_agent = %user_agent,
                        user_agent_truncated,
                        "Failed to upgrade connection"
                    );
                }
            }
            metrics::histogram!("boluo_server_websocket_connection_duration_ms")
                .record(start_time.elapsed().as_millis() as f64);
            websocket_connections_active.decrement(1);
        }
        .instrument(span),
    );

    hyper::Response::builder()
        .status(StatusCode::SWITCHING_PROTOCOLS)
        .header(header::UPGRADE, "websocket")
        .header(header::CONNECTION, "Upgrade")
        .header(header::SEC_WEBSOCKET_ACCEPT, accept)
        .body(Vec::new())
        .unwrap_or_else(|err| {
            tracing::error!(
                event = "websocket.response.build_failed", error = %err, "Failed to build websocket response");
            hyper::Response::default()
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn websocket_buffers_are_bounded() {
        let config = websocket_config();

        assert_eq!(config.read_buffer_size, WEBSOCKET_BUFFER_BYTES);
        assert_eq!(config.write_buffer_size, WEBSOCKET_BUFFER_BYTES);
        assert_eq!(
            config.max_write_buffer_size,
            WEBSOCKET_MAX_WRITE_BUFFER_BYTES
        );
        assert_eq!(config.max_message_size, Some(WEBSOCKET_MAX_MESSAGE_BYTES));
        assert_eq!(config.max_frame_size, Some(WEBSOCKET_MAX_MESSAGE_BYTES));
    }
}
