use std::cell::RefCell;

use super::models::{BasicInfo, Proxy};
use crate::info::models::AppSettings;
use crate::interface::ok_response;
use crate::{error::AppError, info::models::HealthCheck, interface::Response};
use hyper::body::Incoming;
use hyper::{Method, Request};
use sqlx::query_as;

#[derive(Debug, Clone, Default)]
pub struct ProxiesCache {
    proxies: Vec<Proxy>,
    timestamp: Option<u64>,
}

thread_local! {
    pub static PROXIES: RefCell<ProxiesCache> = RefCell::new(ProxiesCache::default());
}

pub async fn get_proxies(ctx: &crate::context::AppContext) -> Result<Vec<Proxy>, AppError> {
    fn make_timestamp() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("Unexpected failture in get timestamp")
            .as_secs()
    }
    let now = make_timestamp();
    let mut proxies: ProxiesCache = ProxiesCache::default();
    PROXIES.with(|x| {
        proxies = x.borrow().clone();
    });
    if let Some(timestamp) = proxies.timestamp {
        if now - timestamp < 60 {
            return Ok(proxies.proxies);
        }
    }

    let proxies: Vec<Proxy> = query_as!(
        Proxy,
        r#"SELECT "name", "url", "region" FROM "proxies" WHERE "is_enabled" = TRUE;"#
    )
    .fetch_all(&ctx.db)
    .await
    .map_err(AppError::from)?;
    PROXIES.with(|x| {
        x.borrow_mut().proxies = proxies.clone();
        x.borrow_mut().timestamp = Some(now);
    });
    Ok(proxies)
}

pub async fn proxies(ctx: &crate::context::AppContext) -> Result<Response, AppError> {
    let proxies: Vec<Proxy> = get_proxies(ctx).await?;
    let Ok(Ok(body)) = tokio::task::spawn_blocking(move || serde_json::to_string(&proxies)).await
    else {
        return Err(AppError::Unexpected(anyhow::anyhow!(
            "Failed to serialize proxies"
        )));
    };
    let response = hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(body.into())
        .expect("Unexpected failture in build proxies response");
    Ok(response)
}

pub fn basic_info() -> Response {
    use std::sync::OnceLock;
    static BASIC_INFO: OnceLock<String> = OnceLock::new();
    let body = BASIC_INFO.get_or_init(|| {
        serde_json::to_string(&BasicInfo::new())
            .expect("Unexpected failture in serialize version information")
    });

    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(body.as_str().into())
        .expect("Unexpected failture in build version response")
}

pub fn settings() -> Response {
    use std::sync::LazyLock;
    static SETTINGS: LazyLock<Response> = LazyLock::new(|| ok_response(AppSettings::new()));
    SETTINGS.clone()
}

pub async fn healthcheck(ctx: &crate::context::AppContext) -> Result<Response, AppError> {
    let health_check: HealthCheck = HealthCheck::new(ctx).await;
    let result = serde_json::to_vec(&health_check).map_err(|err| {
        tracing::error!(
            "Unexpected failture in serialize healthcheck result: {:?}",
            err
        );
        AppError::Unexpected(anyhow::anyhow!("Failed to serialize healthcheck result"))
    })?;
    let response = hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(result)
        .map_err(|err| {
            tracing::error!(
                "Unexpected failture in build healthcheck response: {:?}",
                err
            );
            AppError::Unexpected(anyhow::anyhow!("Failed to build healthcheck response"))
        })?;
    Ok(response)
}

pub fn echo(req: Request<Incoming>) -> Response {
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "text/plain")
        .status(hyper::StatusCode::OK)
        .body(format!("{:?}", req.headers()).into_bytes())
        .unwrap_or(hyper::Response::default())
}

pub async fn router(
    ctx: &crate::context::AppContext,
    req: Request<Incoming>,
    path: &str,
) -> Result<Response, AppError> {
    match (path, req.method().clone()) {
        ("/proxies", Method::GET) => proxies(ctx).await,
        ("/healthcheck", Method::GET) => healthcheck(ctx).await,
        ("/settings", Method::GET) => Ok(settings()),
        ("/echo", Method::GET) => Ok(echo(req)),
        _ => Ok(basic_info()),
    }
}
