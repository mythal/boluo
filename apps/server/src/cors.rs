//! Make server allow all origins for development.
use std::sync::OnceLock;

use bytes::Bytes;
use http_body_util::Full;
use hyper::body::Incoming;
use hyper::header::{
    ACCESS_CONTROL_ALLOW_CREDENTIALS, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS,
    ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_MAX_AGE, ACCESS_CONTROL_REQUEST_HEADERS,
    HeaderValue, ORIGIN,
};
use hyper::{Request, Response};

use crate::context::domain;

pub fn is_allowed_origin(origin: &str) -> bool {
    static DOMAIN_SUFFIX: OnceLock<String> = OnceLock::new();

    let end = [
        DOMAIN_SUFFIX.get_or_init(|| {
            let domain = domain();
            format!(".{domain}")
        }),
        ".boluo-legacy.pages.dev",
        ".boluo-app.pages.dev",
        ".mythal.workers.dev",
    ];
    if end.iter().any(|x| origin.ends_with(x)) {
        return true;
    }

    static ALLOWED_ORIGIN: OnceLock<String> = OnceLock::new();
    let start = [
        ALLOWED_ORIGIN.get_or_init(|| {
            let domain = domain();
            let addr_v4: Result<std::net::Ipv4Addr, _> = domain.parse();
            if let Ok(addr) = addr_v4 {
                tracing::warn!("[Security] Allowing all origins for IP address: {}", domain);
                return format!("http://{addr}");
            }

            let addr_v6: Result<std::net::Ipv6Addr, _> = domain.parse();
            if let Ok(addr) = addr_v6 {
                tracing::warn!("[Security] Allowing all origins for IP address: {}", domain);
                return format!("http://[{addr}]");
            }
            format!("https://{domain}")
        }),
        "http://localhost:",
        "http://127.0.0.1:",
        "https://boluo-net.kagangtuya.top",
    ];
    start.iter().any(|x| origin.starts_with(x))
}

pub fn allow_origin(origin: Option<&str>, mut res: Response<Full<Bytes>>) -> Response<Full<Bytes>> {
    let header = res.headers_mut();
    let origin = if let Some(origin) = origin {
        if is_allowed_origin(origin) {
            origin
        } else {
            ""
        }
    } else {
        ""
    };
    header.insert(
        ACCESS_CONTROL_ALLOW_ORIGIN,
        HeaderValue::from_str(origin).unwrap_or_else(|_| {
            tracing::warn!(
                "[Unexpected] Failed to convert origin to HeaderValue: {:?}",
                origin
            );
            HeaderValue::from_static("")
        }),
    );
    header.insert(
        ACCESS_CONTROL_ALLOW_CREDENTIALS,
        HeaderValue::from_static("true"),
    );
    header.insert(ACCESS_CONTROL_MAX_AGE, HeaderValue::from_static("86400"));
    res
}

pub fn preflight_requests(res: Request<Incoming>) -> Response<Full<Bytes>> {
    let headers = res.headers();
    let allow_headers = headers
        .get(ACCESS_CONTROL_REQUEST_HEADERS)
        .cloned()
        .unwrap_or_else(|| HeaderValue::from_static(""));
    let response = Response::builder()
        .header(
            ACCESS_CONTROL_ALLOW_METHODS,
            HeaderValue::from_static("GET, POST, PUT, DELETE, PATCH"),
        )
        .header(ACCESS_CONTROL_ALLOW_HEADERS, allow_headers)
        .body(Full::new(Bytes::new()))
        .unwrap();
    let origin = res.headers().get(ORIGIN).and_then(|x| x.to_str().ok());
    allow_origin(origin, response)
}
