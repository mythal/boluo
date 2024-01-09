use std::cell::RefCell;

use super::models::Proxy;
use crate::{
    database::{self, Querist},
    error::AppError,
    info::models::HealthCheck,
    interface::Response,
};
use hyper::{Body, Method, Request};

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
        if now - timestamp < 60 * 60 {
            return Ok(proxies.proxies);
        }
    }

    let mut db = database::get().await.expect("Unexpected failture in get database");
    let result = db.query(include_str!("sql/proxies.sql"), &[]).await;
    let proxies: Vec<Proxy> = match result {
        Ok(rows) => rows
            .into_iter()
            .map(|row| {
                let name: String = row.get(0);
                let url: String = row.get(1);
                let region: String = row.get(2);
                Proxy { name, url, region }
            })
            .collect(),

        Err(err) => {
            log::warn!("Unexpected failture in query proxies: {:?}", err);
            vec![]
        }
    };
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
        .body(Body::from(body))
        .expect("Unexpected failture in build proxies response");
    Ok(response)
}

pub fn version() -> Response {
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(Body::from(include_str!("../../../../version.json")))
        .expect("Unexpected failture in build version response")
}

async fn get_healthcheck() -> HealthCheck {
    use std::sync::OnceLock;
    use tokio::sync::Mutex;
    static HEALTH_CHECK: OnceLock<Mutex<Option<HealthCheck>>> = OnceLock::new();
    let mut lock = HEALTH_CHECK.get_or_init(|| Mutex::new(None)).lock().await;
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
                log::error!("Unexpected failture in serialize healthcheck result: {:?}", err);
                AppError::Unexpected(anyhow::anyhow!("Failed to serialize healthcheck result"))
            })
            .map(|bytes| Body::from(bytes))
    });
    let result = task
        .await
        .map_err(|_err| AppError::Unexpected(anyhow::anyhow!("Failed to join healthcheck task")))??;
    let response = hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(result)
        .map_err(|err| {
            log::error!("Unexpected failture in build healthcheck response: {:?}", err);
            AppError::Unexpected(anyhow::anyhow!("Failed to build healthcheck response"))
        })?;
    Ok(response)
}

pub async fn router(req: Request<Body>, path: &str) -> Result<Response, AppError> {
    match (path, req.method().clone()) {
        ("/proxies", Method::GET) => proxies().await,
        ("/healthcheck", Method::GET) => healthcheck().await,
        _ => Ok(version()),
    }
}
