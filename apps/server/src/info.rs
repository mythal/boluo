use crate::interface::Response;
use hyper::{Body, Method, Request};

pub fn proxies() -> Response {
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(Body::from(""))
        .expect("Unexpected failture in build proxies response")
}

pub fn version() -> Response {
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(Body::from(include_str!("../../../version.json")))
        .expect("Unexpected failture in build version response")
}

pub fn router(req: Request<Body>, path: &str) -> Response {
    match (path, req.method().clone()) {
        ("/proxies", Method::GET) => proxies(),
        _ => version(),
    }
}
