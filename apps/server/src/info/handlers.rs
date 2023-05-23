use super::models::Proxy;
use crate::{
    database::{self, Querist},
    interface::Response,
};
use hyper::{Body, Method, Request};

// TODO: cache
pub async fn proxies() -> Response {
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
    let body = serde_json::to_string(&proxies).expect("Unexpected failture in serialize proxies");
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(Body::from(body))
        .expect("Unexpected failture in build proxies response")
}

pub fn version() -> Response {
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(Body::from(include_str!("../../../../version.json")))
        .expect("Unexpected failture in build version response")
}

pub async fn router(req: Request<Body>, path: &str) -> Response {
    match (path, req.method().clone()) {
        ("/proxies", Method::GET) => proxies().await,
        _ => version(),
    }
}
