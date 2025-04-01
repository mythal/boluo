//! Sentry Tunnel
//!
//! https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
use crate::{error::AppError, interface::Response};
use http_body_util::BodyExt;
use hyper::body::Incoming;
use hyper::{Request, StatusCode};
use reqwest::Client;
use serde_json::Value;
use std::env;
use std::sync::OnceLock;

static SENTRY_HOST: OnceLock<String> = OnceLock::new();
static SENTRY_PROJECT_IDS: OnceLock<Vec<String>> = OnceLock::new();
static HTTP_CLIENT: OnceLock<Client> = OnceLock::new();

fn get_sentry_host() -> &'static String {
    SENTRY_HOST.get_or_init(|| {
        env::var("SENTRY_HOST").unwrap_or_else(|_| "o4505241434972160.ingest.sentry.io".to_string())
    })
}

fn get_project_ids() -> &'static Vec<String> {
    SENTRY_PROJECT_IDS.get_or_init(|| {
        env::var("SENTRY_PROJECT_IDS")
            .map(|ids| ids.split(',').map(|id| id.trim().to_string()).collect())
            .unwrap_or_else(|_| vec!["4505241434972160".to_string()])
    })
}

fn get_http_client() -> &'static Client {
    HTTP_CLIENT.get_or_init(Client::new)
}

pub async fn tunnel(req: Request<Incoming>, _path: &str) -> Result<Response, AppError> {
    // Extract body bytes
    let body_bytes = req
        .into_body()
        .collect()
        .await
        .map_err(|_| AppError::BadRequest("Failed to read request body".to_string()))?
        .to_bytes();

    // Parse envelope header from first line
    let envelope = String::from_utf8(body_bytes.slice(..body_bytes.len()).to_vec())
        .map_err(|_| AppError::BadRequest("Invalid envelope encoding".to_string()))?;

    let header = envelope
        .lines()
        .next()
        .ok_or_else(|| AppError::BadRequest("Empty envelope".to_string()))?;

    let header: Value = serde_json::from_str(header)
        .map_err(|_| AppError::BadRequest("Invalid envelope header".to_string()))?;

    // Extract and validate DSN
    let dsn = header
        .get("dsn")
        .and_then(|dsn| dsn.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing DSN".to_string()))?;
    let dsn = reqwest::Url::parse(dsn)
        .map_err(|_| AppError::BadRequest("Invalid DSN URL".to_string()))?;

    // Validate hostname
    if dsn.host_str() != Some(get_sentry_host()) {
        return Err(AppError::BadRequest(format!(
            "Invalid Sentry host: {}",
            dsn.host_str().unwrap_or("none")
        )));
    }

    let project_id = dsn
        .path_segments()
        .and_then(|segments| segments.last())
        .ok_or_else(|| AppError::BadRequest("Missing project ID".to_string()))?;

    if !get_project_ids().contains(&project_id.to_string()) {
        return Err(AppError::BadRequest(format!(
            "Invalid project ID: {}",
            project_id
        )));
    }

    let upstream_url = format!("https://{}/api/{}/envelope/", get_sentry_host(), project_id);

    let response = get_http_client()
        .post(&upstream_url)
        .body(body_bytes)
        .send()
        .await
        .map_err(|e| AppError::Unexpected(e.into()))?;

    if !response.status().is_success() {
        log::warn!(
            "Sentry tunnel request failed: {} {}",
            response.status(),
            response.text().await.unwrap_or_default()
        );
    }

    hyper::Response::builder()
        .status(StatusCode::OK)
        .body(Vec::new())
        .map_err(|e| AppError::Unexpected(e.into()))
}
