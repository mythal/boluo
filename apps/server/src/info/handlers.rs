use std::cell::RefCell;

use super::models::Proxy;
use crate::{db, error::AppError, info::models::HealthCheck, interface::Response};
use hyper::body::Incoming;
use hyper::{Method, Request};
use serde::{Deserialize, Serialize};
use sqlx::query_as;

#[derive(Debug, Clone, Default)]
pub struct ProxiesCache {
    proxies: Vec<Proxy>,
    timestamp: Option<u64>,
}

thread_local! {
    pub static PROXIES: RefCell<ProxiesCache> = RefCell::new(ProxiesCache::default());
}

pub async fn get_proxies() -> Result<Vec<Proxy>, AppError> {
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

    let pool = db::get().await;

    let proxies: Vec<Proxy> = query_as!(
        Proxy,
        r#"SELECT "name", "url", "region" FROM "proxies" WHERE "is_enabled" = TRUE;"#
    )
    .fetch_all(&pool)
    .await
    .map_err(AppError::from)?;
    PROXIES.with(|x| {
        x.borrow_mut().proxies = proxies.clone();
        x.borrow_mut().timestamp = Some(now);
    });
    Ok(proxies)
}

pub async fn proxies() -> Result<Response, AppError> {
    let proxies: Vec<Proxy> = get_proxies().await?;
    let body = serde_json::to_string(&proxies).expect("Unexpected failture in serialize proxies");
    let response = hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(body.into())
        .expect("Unexpected failture in build proxies response");
    Ok(response)
}

#[derive(Debug, Serialize, Deserialize)]
struct BascInfo {
    version: String,
    media_url: String,
}

pub fn basic_info() -> Response {
    use std::sync::OnceLock;
    static BASIC_INFO: OnceLock<String> = OnceLock::new();
    let body = BASIC_INFO.get_or_init(|| {
        let version = std::env::var("VERSION").unwrap_or_else(|_| "unknown".to_string());
        let media_url = std::env::var("PUBLIC_MEDIA_URL")
            .unwrap_or_else(|_| "https://media.boluo.chat".to_string());
        serde_json::to_string(&BascInfo { version, media_url })
            .expect("Unexpected failture in serialize version information")
    });

    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(body.as_str().into())
        .expect("Unexpected failture in build version response")
}

async fn get_healthcheck() -> HealthCheck {
    use tokio::sync::Mutex;
    static HEALTH_CHECK: Mutex<Option<HealthCheck>> = Mutex::const_new(None);
    let mut lock = HEALTH_CHECK.lock().await;
    if let Some(health_check) = lock.as_ref() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|x| x.as_secs())
            .unwrap_or(0);
        if now == health_check.timestamp_sec {
            return health_check.clone();
        }
    }
    let health_check = HealthCheck::new().await;
    *lock = Some(HealthCheck::new().await);
    health_check
}

pub async fn healthcheck() -> Result<Response, AppError> {
    let task = tokio::spawn(async {
        let health_check: HealthCheck = get_healthcheck().await;
        serde_json::to_vec(&health_check)
            .map_err(|err| {
                log::error!(
                    "Unexpected failture in serialize healthcheck result: {:?}",
                    err
                );
                AppError::Unexpected(anyhow::anyhow!("Failed to serialize healthcheck result"))
            })
            .map(Into::into)
    });
    let result = task.await.map_err(|_err| {
        AppError::Unexpected(anyhow::anyhow!("Failed to join healthcheck task"))
    })??;
    let response = hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(result)
        .map_err(|err| {
            log::error!(
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

pub async fn router(req: Request<Incoming>, path: &str) -> Result<Response, AppError> {
    match (path, req.method().clone()) {
        ("/proxies", Method::GET) => proxies().await,
        ("/healthcheck", Method::GET) => healthcheck().await,
        ("/echo", Method::GET) => Ok(echo(req)),
        _ => Ok(basic_info()),
    }
}
