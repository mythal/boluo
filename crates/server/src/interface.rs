//! Types and functions for to help building APIs.
use hyper::StatusCode;
use hyper::body::Body;
use serde::{Deserialize, Serialize};
use smallvec::SmallVec;
use std::io;
use std::sync::{
    Arc,
    atomic::{AtomicU64, Ordering},
};
use std::time::{Duration, Instant};

use crate::error::AppError;
pub const INLINE_RESPONSE_BODY_BYTES: usize = 256;
#[derive(Debug, Default)]
pub struct ResponseBytes(SmallVec<[u8; INLINE_RESPONSE_BODY_BYTES]>);

impl ResponseBytes {
    pub fn new() -> Self {
        Self(SmallVec::new())
    }

    pub fn from_slice(bytes: &[u8]) -> Self {
        Self(SmallVec::from_slice(bytes))
    }

    pub fn from_serializable<T: Serialize>(value: &T) -> Result<Self, serde_json::Error> {
        let mut bytes = Self::new();
        serde_json::to_writer(&mut bytes, value)?;
        Ok(bytes)
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn spilled(&self) -> bool {
        self.0.spilled()
    }
}

impl AsRef<[u8]> for ResponseBytes {
    fn as_ref(&self) -> &[u8] {
        self.0.as_slice()
    }
}

impl From<Vec<u8>> for ResponseBytes {
    fn from(bytes: Vec<u8>) -> Self {
        Self(SmallVec::from_vec(bytes))
    }
}

impl From<String> for ResponseBytes {
    fn from(value: String) -> Self {
        Self::from(value.into_bytes())
    }
}

impl From<&str> for ResponseBytes {
    fn from(value: &str) -> Self {
        Self::from_slice(value.as_bytes())
    }
}

impl io::Write for ResponseBytes {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        io::Write::write(&mut self.0, bytes)
    }

    fn flush(&mut self) -> io::Result<()> {
        io::Write::flush(&mut self.0)
    }
}

pub type Response = hyper::Response<ResponseBytes>;

/// Maximum request size for ordinary JSON API payloads.
pub const DEFAULT_JSON_BODY_LIMIT_BYTES: usize = 1024 * 1024;
/// Maximum request size for message payloads, whose parsed entities may be substantially larger.
pub const LARGE_JSON_BODY_LIMIT_BYTES: usize = 4 * 1024 * 1024;

#[derive(Debug, Default)]
pub(crate) struct RequestBodyReadTracker(AtomicU64);

impl RequestBodyReadTracker {
    pub(crate) fn new() -> Self {
        Self::default()
    }

    pub(crate) fn duration_ms(&self) -> u64 {
        self.0.load(Ordering::Relaxed)
    }

    fn record(&self, duration_ms: u64) {
        self.0.store(duration_ms, Ordering::Relaxed);
    }
}

const RESPONSE_BODY_SIZE_SAMPLE_INTERVAL: u8 = 64;

thread_local! {
    // Keep sampling off a shared atomic on the response hot path.
    static RESPONSE_BODY_SIZE_SAMPLE_COUNTER: std::cell::Cell<u8> = const {
        std::cell::Cell::new(0)
    };
}

fn should_sample_response_body_size() -> bool {
    RESPONSE_BODY_SIZE_SAMPLE_COUNTER.with(|counter| {
        let current = counter.get();
        counter.set(current.wrapping_add(1));
        current % RESPONSE_BODY_SIZE_SAMPLE_INTERVAL == 0
    })
}

fn record_response_body(bytes: &ResponseBytes) {
    if should_sample_response_body_size() {
        metrics::histogram!("boluo_server_http_response_body_bytes").record(bytes.len() as f64);
    }
    if bytes.spilled() {
        metrics::counter!(
            "boluo_server_http_response_body_total",
            "storage" => "heap"
        )
        .increment(1);
    } else {
        metrics::counter!(
            "boluo_server_http_response_body_total",
            "storage" => "inline"
        )
        .increment(1);
    }
}

fn build_response(bytes: ResponseBytes, status: StatusCode) -> Response {
    record_response_body(&bytes);
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(status)
        .body(bytes)
        .expect("Failed to build response")
}

pub fn err_response(e: AppError) -> Response {
    let status = e.status_code();
    serialize(&WebResult::<()>::err(e))
        .map(|bytes| build_response(bytes, status))
        .unwrap_or_else(|e| {
            tracing::error!(
                event = "http.error_response.serialization_failed",
                "Failed to serialize error: {}",
                e
            );
            build_response(
                ResponseBytes::from_slice(include_bytes!("../text/error_serialize_error.json")),
                hyper::StatusCode::INTERNAL_SERVER_ERROR,
            )
        })
}

fn serialize<T: Serialize>(value: &T) -> Result<ResponseBytes, serde_json::Error> {
    ResponseBytes::from_serializable(value)
}

pub fn ok_response<T: Serialize>(value: T) -> Response {
    serialize(&WebResult::ok(value))
        .map(|bytes| build_response(bytes, hyper::StatusCode::OK))
        .map_err(AppError::Serialize)
        .unwrap_or_else(err_response)
}

pub async fn response<T: Serialize>(value: Result<T, AppError>) -> Result<Response, AppError> {
    let value = value?;
    Ok(ok_response(value))
}

#[derive(Serialize, Debug, Clone)]
pub struct WebError {
    code: &'static str,
    message: String,
    context: serde_json::Value,
}

impl WebError {
    pub fn from_app_error(e: AppError) -> WebError {
        WebError {
            code: e.error_code(),
            message: e.to_string(),
            context: e.context(),
        }
    }
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WebResult<T: Serialize> {
    is_ok: bool,
    ok: Option<T>,
    err: Option<WebError>,
}

impl<T: Serialize> WebResult<T> {
    pub fn ok(value: T) -> WebResult<T> {
        WebResult {
            is_ok: true,
            ok: Some(value),
            err: None,
        }
    }

    pub fn err<E: Into<AppError>>(err: E) -> WebResult<T> {
        WebResult {
            is_ok: false,
            ok: None,
            err: Some(WebError::from_app_error(err.into())),
        }
    }
}

pub fn missing() -> Result<Response, AppError> {
    Err(AppError::missing())
}

pub fn parse_query<T>(uri: &hyper::http::Uri) -> Result<T, AppError>
where
    for<'de> T: Deserialize<'de>,
{
    let query = uri.query().unwrap_or("");
    serde_urlencoded::from_str(query).map_err(|e| {
        let message = format!("Failed to parse the query in the URI ({uri})");
        tracing::debug!("{}: {}", message, e);
        AppError::BadRequest(message)
    })
}

fn record_request_body_read(
    started_at: Instant,
    body_bytes: Option<usize>,
    tracker: Option<&RequestBodyReadTracker>,
) {
    let duration_ms = started_at.elapsed().as_millis() as u64;
    let span = tracing::Span::current();
    span.record("request_body_read_ms", duration_ms);
    if let Some(tracker) = tracker {
        tracker.record(duration_ms);
    }
    if let Some(body_bytes) = body_bytes {
        span.record("request_body_bytes", body_bytes as u64);
    }
}

pub async fn read_body_limited<B>(
    req: hyper::Request<B>,
    max_bytes: usize,
) -> Result<bytes::Bytes, AppError>
where
    B: Body,
{
    use bytes::{Buf, BufMut, BytesMut};
    use http_body_util::BodyExt;

    let tracker = req
        .extensions()
        .get::<Arc<RequestBodyReadTracker>>()
        .cloned();

    if req
        .headers()
        .get(hyper::header::CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .is_some_and(|content_length| content_length > max_bytes as u64)
    {
        record_request_body_read(Instant::now(), None, tracker.as_deref());
        return Err(AppError::PayloadTooLarge);
    }

    let started_at = Instant::now();
    let collect = async move {
        let mut body = std::pin::pin!(req.into_body());
        let mut output = BytesMut::new();
        while let Some(frame) = body.frame().await {
            let frame = frame
                .map_err(|_| AppError::BadRequest("Failed to read the request body".to_string()))?;
            let Ok(data) = frame.into_data() else {
                continue;
            };
            let data_len = data.remaining();
            if data_len > max_bytes.saturating_sub(output.len()) {
                return Err(AppError::PayloadTooLarge);
            }
            output.put(data);
        }
        Ok(output.freeze())
    };
    let collected = tokio::time::timeout(Duration::from_secs(10), collect).await;

    let body = match collected {
        Ok(Ok(body)) => body,
        Ok(Err(error)) => {
            record_request_body_read(started_at, None, tracker.as_deref());
            return Err(error);
        }
        Err(_) => {
            record_request_body_read(started_at, None, tracker.as_deref());
            tracing::warn!(
                event = "http.request_body.read_timeout",
                "Timeout when reading the request body"
            );
            return Err(AppError::Timeout);
        }
    };
    record_request_body_read(started_at, Some(body.len()), tracker.as_deref());
    Ok(body)
}

pub async fn parse_body_limited<T, B>(
    req: hyper::Request<B>,
    max_bytes: usize,
) -> Result<T, AppError>
where
    for<'de> T: Deserialize<'de>,
    B: Body,
{
    let body = read_body_limited(req, max_bytes).await?;
    sonic_rs::from_slice(&body)
        .map_err(|_| AppError::BadRequest("Failed to parse the request body".to_string()))
}

pub async fn parse_body<T>(req: hyper::Request<impl Body>) -> Result<T, AppError>
where
    for<'de> T: Deserialize<'de>,
{
    let body = read_body_limited(req, DEFAULT_JSON_BODY_LIMIT_BYTES).await?;
    sonic_rs::from_slice(&body).map_err(|e| {
        tracing::error!(
            event = "http.request_body.parse_failed", error = %e, "Failed to parse the request body");
        AppError::BadRequest("Failed to parse the request body".to_string())
    })
}

pub async fn parse_large_body<T>(req: hyper::Request<impl Body>) -> Result<Box<T>, AppError>
where
    T: Send + 'static,
    for<'de> T: Deserialize<'de>,
{
    let body = read_body_limited(req, LARGE_JSON_BODY_LIMIT_BYTES).await?;
    sonic_rs::from_slice(&body).map(Box::new).map_err(|e| {
        tracing::error!(
            event = "http.request_body.parse_failed", error = %e, "Failed to parse the request body");
        AppError::BadRequest("Failed to parse the request body".to_string())
    })
}

#[derive(Deserialize, Debug, Eq, PartialEq)]
pub struct IdQuery {
    pub id: uuid::Uuid,
}

#[test]
fn test_get_uuid() {
    use hyper::Uri;
    use uuid::Uuid;

    let uuid = Uuid::new_v4();
    let path_and_query = format!("/?id={uuid}");
    let uri = Uri::builder()
        .path_and_query(&*path_and_query)
        .build()
        .unwrap();
    let query: IdQuery = parse_query(&uri).unwrap();
    assert_eq!(query.id, uuid);

    let uri = Uri::builder().path_and_query("/?id=&").build().unwrap();
    let query = parse_query::<IdQuery>(&uri);
    assert!(query.is_err());
}

#[cfg(test)]
mod body_tests {
    use super::*;
    use bytes::Bytes;
    use http_body_util::Full;
    use serde::Deserialize;

    #[derive(Debug, Deserialize, Eq, PartialEq)]
    struct Payload {
        value: String,
    }

    #[test]
    fn small_response_body_stays_inline() {
        let body = ok_response("ok").into_body();

        assert!(!body.spilled());
        let value: serde_json::Value =
            serde_json::from_slice(body.as_ref()).expect("response should contain valid JSON");
        assert_eq!(value["ok"], "ok");
    }

    #[test]
    fn ascii_string_response_uses_final_size_for_inline_storage() {
        let payload = "x".repeat(100);
        let body = ok_response(payload.as_str()).into_body();

        assert!(body.len() < INLINE_RESPONSE_BODY_BYTES);
        assert!(!body.spilled());
    }

    #[test]
    fn large_response_body_spills_to_heap() {
        let payload = "x".repeat(INLINE_RESPONSE_BODY_BYTES * 2);
        let body = ok_response(payload.as_str()).into_body();

        assert!(body.spilled());
        let value: serde_json::Value =
            serde_json::from_slice(body.as_ref()).expect("response should contain valid JSON");
        assert_eq!(value["ok"], payload);
    }

    #[tokio::test]
    async fn limited_body_accepts_payload_at_limit() {
        let body = Bytes::from_static(br#"{"value":"ok"}"#);
        let request = hyper::Request::new(Full::new(body.clone()));

        let payload = parse_body_limited::<Payload, _>(request, body.len())
            .await
            .expect("payload at the limit should be accepted");

        assert_eq!(
            payload,
            Payload {
                value: "ok".to_string()
            }
        );
    }

    #[tokio::test]
    async fn limited_body_rejects_payload_over_limit() {
        let request = hyper::Request::new(Full::new(Bytes::from_static(b"too large")));

        let error = read_body_limited(request, 8)
            .await
            .expect_err("oversized payload should be rejected");

        assert!(matches!(error, AppError::PayloadTooLarge));
    }

    #[tokio::test]
    async fn limited_body_reports_invalid_json() {
        let request = hyper::Request::new(Full::new(Bytes::from_static(b"not json")));

        let error = parse_body_limited::<Payload, _>(request, 64)
            .await
            .expect_err("invalid JSON should be rejected");

        assert!(matches!(error, AppError::BadRequest(_)));
    }

    #[tokio::test]
    async fn default_json_body_rejects_oversized_payload() {
        let request = hyper::Request::new(Full::new(Bytes::from(vec![
            b' ';
            DEFAULT_JSON_BODY_LIMIT_BYTES
                + 1
        ])));

        let error = parse_body::<Payload>(request)
            .await
            .expect_err("oversized default JSON payload should be rejected");

        assert!(matches!(error, AppError::PayloadTooLarge));
    }

    #[tokio::test]
    async fn limited_body_rejects_oversized_content_length_before_reading() {
        let request = hyper::Request::builder()
            .header(hyper::header::CONTENT_LENGTH, "9")
            .body(Full::new(Bytes::from_static(b"short")))
            .unwrap();

        let error = read_body_limited(request, 8)
            .await
            .expect_err("oversized declared content length should be rejected");

        assert!(matches!(error, AppError::PayloadTooLarge));
    }
}
