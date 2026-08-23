//! Types and functions for to help building APIs.
use hyper::StatusCode;
use hyper::body::Body;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::time::Duration;

use crate::error::AppError;
pub type Response = hyper::Response<Vec<u8>>;

fn build_response(bytes: Vec<u8>, status: StatusCode) -> hyper::Response<Vec<u8>> {
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(status)
        .body(bytes)
        .expect("Failed to build response")
}

pub fn err_response(e: AppError) -> hyper::Response<Vec<u8>> {
    let status = e.status_code();
    sonic_rs::to_vec(&WebResult::<()>::err(e))
        .map(|bytes| build_response(bytes, status))
        .unwrap_or_else(|e| {
            tracing::error!(
                event = "http.error_response.serialization_failed",
                "Failed to serialize error: {}",
                e
            );
            hyper::Response::builder()
                .status(hyper::StatusCode::INTERNAL_SERVER_ERROR)
                .body(
                    include_str!("../text/error_serialize_error.json")
                        .as_bytes()
                        .to_vec(),
                )
                .expect("Failed to build serialize error response")
        })
}

pub fn ok_response<T: Serialize>(value: T) -> hyper::Response<Vec<u8>> {
    sonic_rs::to_vec(&WebResult::ok(value))
        .map(|bytes| build_response(bytes, hyper::StatusCode::OK))
        .map_err(AppError::Serialize)
        .unwrap_or_else(err_response)
}

/// Serialize the value in a blocking task.
pub async fn response<T: Serialize + Send + 'static>(
    value: Result<T, AppError>,
) -> Result<hyper::Response<Vec<u8>>, AppError> {
    let value = value?;
    let response = tokio::task::spawn_blocking(move || ok_response(value))
        .await
        .map_err(|e| AppError::Unexpected(e.into()))?;
    Ok(response)
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

pub fn missing() -> Result<hyper::Response<Vec<u8>>, AppError> {
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

pub async fn read_body_limited<B>(
    req: hyper::Request<B>,
    max_bytes: usize,
) -> Result<bytes::Bytes, AppError>
where
    B: Body,
    B::Error: Into<Box<dyn Error + Send + Sync>>,
{
    use http_body_util::{BodyExt, LengthLimitError, Limited};

    let collected = tokio::time::timeout(
        Duration::from_secs(10),
        Limited::new(req.into_body(), max_bytes).collect(),
    )
    .await
    .map_err(|_| AppError::Timeout)?;

    collected.map(|body| body.to_bytes()).map_err(|error| {
        match error.downcast_ref::<LengthLimitError>() {
            Some(_) => AppError::PayloadTooLarge,
            None => AppError::BadRequest("Failed to read the request body".to_string()),
        }
    })
}

pub async fn parse_body_limited<T, B>(
    req: hyper::Request<B>,
    max_bytes: usize,
) -> Result<T, AppError>
where
    for<'de> T: Deserialize<'de>,
    B: Body,
    B::Error: Into<Box<dyn Error + Send + Sync>>,
{
    let body = read_body_limited(req, max_bytes).await?;
    sonic_rs::from_slice(&body)
        .map_err(|_| AppError::BadRequest("Failed to parse the request body".to_string()))
}

pub async fn parse_body<T>(req: hyper::Request<impl Body>) -> Result<T, AppError>
where
    for<'de> T: Deserialize<'de>,
{
    use http_body_util::BodyExt;
    // TODO: limit the body size
    let collected = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        req.into_body().collect(),
    )
    .await
    .map_err(|_| {
        tracing::warn!(
            event = "http.request_body.read_timeout",
            "Timeout when reading the request body"
        );
        AppError::Timeout
    })?;
    let body = collected
        .map_err(|_| {
            tracing::error!(
                event = "http.request_body.read_failed",
                "Failed to read the request body"
            );
            AppError::BadRequest("Failed to read the request body".to_string())
        })?
        .to_bytes();
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
    use http_body_util::BodyExt;
    let collected = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        req.into_body().collect(),
    )
    .await
    .map_err(|_| {
        tracing::warn!(
            event = "http.request_body.read_timeout",
            "Timeout when reading the request body"
        );
        AppError::Timeout
    })?;
    let body = collected
        .map_err(|_| {
            tracing::error!(
                event = "http.request_body.read_failed",
                "Failed to read the request body"
            );
            AppError::BadRequest("Failed to read the request body".to_string())
        })?
        .to_bytes();
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
}
