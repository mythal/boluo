use std::cell::RefCell;

use super::models::Proxy;
use crate::{
    database::{self, Querist},
    error::AppError,
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

pub async fn router(req: Request<Body>, path: &str) -> Result<Response, AppError> {
    match (path, req.method().clone()) {
        ("/proxies", Method::GET) => proxies().await,
        _ => Ok(version()),
    }
}
