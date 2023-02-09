//! Make server allow all origins for development.
use hyper::header::{
    HeaderValue, ACCESS_CONTROL_ALLOW_CREDENTIALS, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS,
    ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_MAX_AGE, ACCESS_CONTROL_REQUEST_HEADERS, ORIGIN,
};
use hyper::{Body, Request, Response};

pub fn allow_origin(origin: Option<&str>, mut res: Response<Body>) -> Response<Body> {
    let header = res.headers_mut();
    let origin = if let Some(origin) = origin {
        if origin == "https://boluo.chat" || origin.ends_with(".boluo.chat") || origin.starts_with("http://localhost:")
        {
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
            log::warn!("[Unexpected] Failed to convert origin to HeaderValue: {:?}", origin);
            HeaderValue::from_static("")
        }),
    );
    header.insert(ACCESS_CONTROL_ALLOW_CREDENTIALS, HeaderValue::from_static("true"));
    header.insert(ACCESS_CONTROL_MAX_AGE, HeaderValue::from_static("86400"));
    res
}

pub fn preflight_requests(res: Request<Body>) -> Response<Body> {
    let headers = res.headers();
    let allow_headers = headers
        .get(ACCESS_CONTROL_REQUEST_HEADERS)
        .map(Clone::clone)
        .unwrap_or_else(|| HeaderValue::from_static(""));
    let response = Response::builder()
        .header(
            ACCESS_CONTROL_ALLOW_METHODS,
            HeaderValue::from_static("GET, POST, PUT, DELETE, PATCH"),
        )
        .header(ACCESS_CONTROL_ALLOW_HEADERS, allow_headers)
        .body(Body::empty())
        .unwrap();
    let origin = res.headers().get(ORIGIN).and_then(|x| x.to_str().ok());
    allow_origin(origin, response)
}
