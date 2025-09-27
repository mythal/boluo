//! Types and functions for to help building APIs.
use hyper::StatusCode;
use hyper::body::Body;
use serde::{Deserialize, Serialize};

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
    serde_json::to_vec(&WebResult::<()>::err(e))
        .map(|bytes| build_response(bytes, status))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to serialize error: {}", e);
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
    serde_json::to_vec(&WebResult::ok(value))
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
        tracing::warn!("Timeout when reading the request body");
        AppError::Timeout
    })?;
    let body = collected
        .map_err(|_| {
            tracing::error!("Failed to read the request body");
            AppError::BadRequest("Failed to read the request body".to_string())
        })?
        .to_bytes();
    serde_json::from_slice(&body).map_err(|e| {
        tracing::error!(error = %e, "Failed to parse the request body");
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
        tracing::warn!("Timeout when reading the request body");
        AppError::Timeout
    })?;
    let body = collected
        .map_err(|_| {
            tracing::error!("Failed to read the request body");
            AppError::BadRequest("Failed to read the request body".to_string())
        })?
        .to_bytes();
    tokio::task::spawn_blocking(move || {
        serde_json::from_slice(&body).map(Box::new).map_err(|e| {
            tracing::error!(error = %e, "Failed to parse the request body");
            AppError::BadRequest("Failed to parse the request body".to_string())
        })
    })
    .await
    .map_err(|e| AppError::Unexpected(e.into()))
    .flatten()
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
