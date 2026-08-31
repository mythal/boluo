//! Cross-origin request handling for production frontends and local development.
use http_body_util::Full;
use hyper::body::Incoming;
use hyper::header::{
    ACCESS_CONTROL_ALLOW_CREDENTIALS, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS,
    ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_EXPOSE_HEADERS, ACCESS_CONTROL_MAX_AGE,
    ACCESS_CONTROL_REQUEST_HEADERS, HeaderValue, ORIGIN,
};
use hyper::{Request, Response};
use std::io::Cursor;

use crate::interface::ResponseBytes;

pub fn is_allowed_origin(origin: &str) -> bool {
    let Ok(origin) = url::Url::parse(origin) else {
        return false;
    };
    if origin.username() != ""
        || origin.password().is_some()
        || origin.path() != "/"
        || origin.query().is_some()
        || origin.fragment().is_some()
    {
        return false;
    }

    let is_loopback = match origin.host() {
        Some(url::Host::Domain("localhost")) => true,
        Some(url::Host::Ipv4(address)) => address.is_loopback(),
        Some(url::Host::Ipv6(address)) => address.is_loopback(),
        _ => false,
    };
    if origin.scheme() == "http" && is_loopback {
        return true;
    }

    let Some(host) = origin.host_str() else {
        return false;
    };
    if origin.scheme() != "https" || origin.port().is_some() {
        return false;
    }

    matches!(
        host,
        "boluo.chat" | "boluochat.com" | "boluo-net.kagangtuya.top"
    ) || [
        ".boluo.chat",
        ".boluochat.com",
        ".boluo-legacy.pages.dev",
        ".boluo-app.pages.dev",
        ".mythal.workers.dev",
    ]
    .iter()
    .any(|suffix| host.ends_with(suffix))
}

pub fn allow_origin<B>(origin: Option<&str>, mut res: Response<B>) -> Response<B> {
    let header = res.headers_mut();
    if let Some(origin) = origin.filter(|origin| is_allowed_origin(origin)) {
        match HeaderValue::from_str(origin) {
            Ok(origin) => {
                header.insert(ACCESS_CONTROL_ALLOW_ORIGIN, origin);
                header.insert(
                    ACCESS_CONTROL_ALLOW_CREDENTIALS,
                    HeaderValue::from_static("true"),
                );
            }
            Err(_) => {
                tracing::warn!(
                    event = "http.cors.origin_header_invalid",
                    "[Unexpected] Failed to convert origin to HeaderValue: {:?}",
                    origin
                );
            }
        }
    }
    header.insert(
        ACCESS_CONTROL_EXPOSE_HEADERS,
        HeaderValue::from_static("x-request-id"),
    );
    header.insert(ACCESS_CONTROL_MAX_AGE, HeaderValue::from_static("86400"));
    res
}

pub fn preflight_requests(res: Request<Incoming>) -> Response<Full<Cursor<ResponseBytes>>> {
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
        .body(Full::new(Cursor::new(ResponseBytes::new())))
        .unwrap();
    let origin = res.headers().get(ORIGIN).and_then(|x| x.to_str().ok());
    allow_origin(origin, response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use bytes::Bytes;

    #[test]
    fn accepts_production_and_preview_origins() {
        for origin in [
            "https://boluo.chat",
            "https://boluochat.com",
            "https://app.boluo.chat",
            "https://preview.boluo-app.pages.dev",
            "https://preview.mythal.workers.dev",
            "https://boluo-net.kagangtuya.top",
        ] {
            assert!(is_allowed_origin(origin), "expected {origin} to be allowed");
        }
    }

    #[test]
    fn accepts_local_development_origins() {
        for origin in [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://[::1]:3000",
        ] {
            assert!(is_allowed_origin(origin), "expected {origin} to be allowed");
        }
    }

    #[test]
    fn rejects_lookalike_and_non_origin_urls() {
        for origin in [
            "https://boluo.chat.evil.example",
            "https://boluo.chat@evil.example",
            "https://boluo.chat/path",
            "https://boluo.chat?query=value",
            "https://boluo.chat#fragment",
            "https://boluo.chat:8443",
            "http://boluo.chat",
            "null",
            "not a URL",
        ] {
            assert!(
                !is_allowed_origin(origin),
                "expected {origin} to be rejected"
            );
        }
    }

    #[test]
    fn disallowed_origin_does_not_receive_cors_permission() {
        let response = allow_origin(
            Some("https://boluo.chat.evil.example"),
            Response::new(Full::new(Bytes::new())),
        );

        assert!(!response.headers().contains_key(ACCESS_CONTROL_ALLOW_ORIGIN));
        assert!(
            !response
                .headers()
                .contains_key(ACCESS_CONTROL_ALLOW_CREDENTIALS)
        );
    }
}
