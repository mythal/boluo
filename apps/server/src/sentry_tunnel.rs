//! Sentry tunnel handler.
//!
//! [Documentation](https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option)
use std::collections::HashSet;
use std::env;
use std::sync::LazyLock;

use anyhow::anyhow;
use hyper::body::Incoming;
use hyper::{Method, Request};
use serde_json::Value;

use crate::error::AppError;

static SENTRY_HOST: LazyLock<String> =
    LazyLock::new(|| env::var("SENTRY_HOST").unwrap_or_else(|_| "sentry.mythal.net".to_string()));

static KNOWN_PROJECT_IDS: LazyLock<HashSet<String>> = LazyLock::new(|| {
    env::var("SENTRY_PROJECT_IDS")
        .unwrap_or_default()
        .split(',')
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.trim().to_string())
        .collect()
});

pub async fn handler(req: Request<Incoming>) -> crate::interface::Response {
    fn error(e: AppError) -> crate::interface::Response {
        let status = e.status_code();
        let body = if let Ok(bytes) = serde_json::to_vec(&serde_json::json!({
            "error": e.to_string(),
        })) {
            bytes
        } else {
            tracing::error!(error = %e, "Failed to serialize error");
            b"{\"error\":\"Failed to serialize error\"}".to_vec()
        };
        if let Ok(response) = hyper::Response::builder()
            .status(status)
            .header(hyper::header::CONTENT_TYPE, "application/json")
            .body(body)
        {
            response
        } else {
            tracing::error!(error = %e, "Failed to build response");
            hyper::Response::new(Vec::new())
        }
    }
    if req.method() != Method::POST {
        return error(AppError::BadRequest("Method not allowed".to_string()));
    }

    use http_body_util::BodyExt;
    let body = if let Ok(bytes) = req.into_body().collect().await {
        bytes.to_bytes()
    } else {
        tracing::error!("Failed to read request body");
        return error(AppError::Unexpected(anyhow!("Failed to read request body")));
    };

    if body.is_empty() {
        return error(AppError::BadRequest("Empty request body".to_string()));
    }

    let Ok(body_str) = String::from_utf8(body.to_vec()) else {
        tracing::error!("Invalid UTF-8 in request body");
        return error(AppError::BadRequest(format!(
            "Invalid UTF-8 in request body"
        )));
    };

    let lines: Vec<&str> = body_str.lines().collect();
    if lines.is_empty() {
        return error(AppError::BadRequest("No lines in request body".to_string()));
    }

    let header_line = lines[0];
    let Ok(header_json): Result<Value, _> = serde_json::from_str(header_line) else {
        tracing::error!(header_line, "Failed to parse header JSON");
        return error(AppError::BadRequest(
            "Failed to parse header JSON".to_string(),
        ));
    };

    let Some(dsn_str) = header_json.get("dsn").and_then(|v| v.as_str()) else {
        tracing::error!("No dsn field found in header");
        return error(AppError::BadRequest(
            "No dsn field found in header".to_string(),
        ));
    };

    let Ok(dsn_url) = url::Url::parse(dsn_str) else {
        tracing::error!(dsn_str, "Invalid DSN URL");
        return error(AppError::BadRequest("Invalid DSN URL".to_string()));
    };

    let dsn_host = dsn_url.host_str().unwrap_or("");
    if !dsn_host.eq_ignore_ascii_case(&SENTRY_HOST) {
        return error(AppError::BadRequest("DSN host not allowed".to_string()));
    }

    let project_id = dsn_url
        .path()
        .trim_start_matches('/')
        .trim_end_matches('/')
        .to_string();

    if KNOWN_PROJECT_IDS.is_empty() {
        tracing::warn!("SENTRY_PROJECT_IDS not configured, rejecting tunnel request");
        return error(AppError::BadRequest(
            "Sentry tunnel not configured".to_string(),
        ));
    }

    if !KNOWN_PROJECT_IDS.contains(&project_id) {
        tracing::warn!("Unknown project ID: {}", project_id);
        return error(AppError::BadRequest("Project ID not allowed".to_string()));
    }

    let target_url = format!("https://{}/api/{}/envelope/", dsn_host, project_id);

    let client = reqwest::Client::new();
    let response = match client
        .post(&target_url)
        .header("Content-Type", "application/x-sentry-envelope")
        .body(body.to_vec())
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            tracing::error!(error = %e, "Failed to forward request to Sentry");
            return error(AppError::Unexpected(anyhow!(
                "Failed to forward request to Sentry"
            )));
        }
    };

    tracing::info!(
        "Forwarded Sentry envelope for project {} to {}",
        project_id,
        target_url
    );

    let status = response.status();
    let content_type = response.headers().get("content-type").cloned();
    let Ok(response_body) = response.bytes().await else {
        tracing::error!("Failed to read Sentry response");
        return error(AppError::Unexpected(anyhow!(
            "Failed to read Sentry response"
        )));
    };

    let mut hyper_response = hyper::Response::builder().status(status);

    if let Some(content_type) = content_type {
        hyper_response = hyper_response.header("content-type", content_type);
    }

    if let Ok(response) = hyper_response.body(response_body.to_vec()) {
        response
    } else {
        tracing::error!("Failed to build response");
        hyper::Response::new(Vec::new())
    }
}
