//! Types and functions for to help building APIs.
use hyper::{Body, StatusCode};
use serde::{Deserialize, Serialize};

use crate::error::AppError;

pub type Request = hyper::Request<hyper::Body>;
pub type Response = hyper::Response<hyper::Body>;
pub type HyperResult = Result<hyper::Response<hyper::Body>, hyper::Error>;

fn build_response(bytes: Vec<u8>, status: StatusCode) -> Response {
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(status)
        .body(Body::from(bytes))
        .expect("Failed to build response")
}

pub fn err_response(e: AppError) -> Response {
    let status = e.status_code();
    serde_json::to_vec(&WebResult::<()>::err(e))
        .map(|bytes| build_response(bytes, status))
        .unwrap_or_else(|e| {
            log::error!("Failed to serialize error: {}", e);
            hyper::Response::builder()
                .status(hyper::StatusCode::INTERNAL_SERVER_ERROR)
                .body(hyper::Body::from(include_str!("error_serialize_error.json")))
                .expect("Failed to build serialize error response")
        })
}

pub fn ok_response<T: Serialize>(value: T) -> Response {
    serde_json::to_vec(&WebResult::ok(value))
        .map(|bytes| build_response(bytes, hyper::StatusCode::OK))
        .map_err(AppError::Serialize)
        .unwrap_or_else(err_response)
}

#[derive(Serialize, Debug)]
pub struct WebError {
    code: &'static str,
    message: String,
    context: serde_json::Value,
}

impl WebError {
    fn from(e: AppError) -> WebError {
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
            err: Some(WebError::from(err.into())),
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
        log::debug!("{}: {}", message, e);
        AppError::BadRequest(message)
    })
}

pub async fn parse_body<T>(req: hyper::Request<Body>) -> Result<T, AppError>
where
    for<'de> T: Deserialize<'de>,
{
    let body = hyper::body::to_bytes(req.into_body()).await.map_err(|e| {
        log::debug!("{}", e);
        AppError::BadRequest("Failed to read the request body".to_string())
    })?;
    serde_json::from_slice(&body).map_err(|e| {
        log::debug!("{}", e);
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
    let uri = Uri::builder().path_and_query(&*path_and_query).build().unwrap();
    let query: IdQuery = parse_query(&uri).unwrap();
    assert_eq!(query.id, uuid);

    let uri = Uri::builder().path_and_query("/?id=&").build().unwrap();
    let query = parse_query::<IdQuery>(&uri);
    assert!(query.is_err());
}
