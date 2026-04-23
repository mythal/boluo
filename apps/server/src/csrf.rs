use crate::error::AppError;
use crate::session::{self, AuthenticateFail, Session};
use crate::utils::{sign, verify};
use hyper::HeaderMap;
use hyper::Request;
use hyper::body::Body;
use hyper::header::{COOKIE, HeaderValue};
use uuid::Uuid;

pub const CSRF_COOKIE_KEY: &str = "boluo-csrf-token";
pub const CSRF_HEADER_KEY: &str = "x-csrf-token";

fn csrf_sign_message(session_key: &Uuid, nonce: &str) -> String {
    let session_id = session_key.as_hyphenated().to_string();
    format!("{}!{}!{}!{}", session_id.len(), session_id, nonce.len(), nonce)
}

fn is_safe_method(method: &hyper::Method) -> bool {
    matches!(
        *method,
        hyper::Method::GET | hyper::Method::HEAD | hyper::Method::OPTIONS | hyper::Method::TRACE
    )
}

fn parse_cookie(headers: &HeaderMap<HeaderValue>, key: &str) -> Option<String> {
    let cookies = headers.get_all(COOKIE);
    for header_value in cookies.iter() {
        let Ok(value) = header_value.to_str() else {
            continue;
        };
        for item in value.split(';') {
            let item = item.trim();
            let Some((name, cookie_value)) = item.split_once('=') else {
                continue;
            };
            if name == key && !cookie_value.is_empty() {
                return Some(cookie_value.to_string());
            }
        }
    }
    None
}

fn invalid_csrf() -> AppError {
    AppError::NoPermission("Invalid CSRF token".to_string())
}

fn csrf_fail(
    req: &Request<impl Body>,
    session: &Session,
    reason: &'static str,
) -> Result<(), AppError> {
    let compat_mode = crate::context::csrf_compat_mode();
    tracing::warn!(
        user_id = %session.user_id,
        session_id = %session.id,
        method = %req.method(),
        path = %req.uri().path(),
        reason = reason,
        compat_mode = compat_mode,
        "CSRF validation failed"
    );

    if compat_mode {
        Ok(())
    } else {
        Err(invalid_csrf())
    }
}

fn verify_csrf(req: &Request<impl Body>, session: &Session) -> Result<(), AppError> {
    if is_safe_method(req.method()) {
        return Ok(());
    }
    if !session::is_authenticate_use_cookie(req.headers()) {
        return Ok(());
    }

    let Some(header_token) = req
        .headers()
        .get(CSRF_HEADER_KEY)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|token| !token.is_empty())
    else {
        if crate::context::csrf_compat_mode() {
            return Ok(());
        }
        return csrf_fail(req, session, "missing_header");
    };

    let Some(cookie_token) = parse_cookie(req.headers(), CSRF_COOKIE_KEY) else {
        return csrf_fail(req, session, "missing_cookie");
    };

    if header_token != cookie_token {
        return csrf_fail(req, session, "header_cookie_mismatch");
    }

    let Some((nonce, signature)) = cookie_token.split_once('.') else {
        return csrf_fail(req, session, "malformed_token");
    };
    if nonce.is_empty() || signature.is_empty() {
        return csrf_fail(req, session, "empty_nonce_or_signature");
    }

    let message = csrf_sign_message(&session.id, nonce);
    if verify(&message, signature).is_err() {
        return csrf_fail(req, session, "invalid_signature");
    }
    Ok(())
}

pub async fn authenticate(req: &Request<impl Body>) -> Result<Session, AppError> {
    let session = session::authenticate(req).await?;
    verify_csrf(req, &session)?;
    Ok(session)
}

pub async fn authenticate_optional(req: &Request<impl Body>) -> Result<Option<Session>, AppError> {
    let session = session::authenticate(req).await;
    match session {
        Ok(session) => {
            verify_csrf(req, &session)?;
            Ok(Some(session))
        }
        Err(AppError::Unauthenticated(AuthenticateFail::Guest)) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn generate_csrf_token(session_key: &Uuid) -> String {
    use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD as base64_engine};

    // OWASP Signed Double-Submit Cookie:
    // csrf = random_nonce + "." + HMAC(session_id + random_nonce)
    let nonce = Uuid::new_v4().as_simple().to_string();
    let message = csrf_sign_message(session_key, &nonce);
    let signature = sign(&message);

    let mut token = String::with_capacity(128);
    token.push_str(&nonce);
    token.push('.');
    base64_engine.encode_string(signature.as_ref(), &mut token);
    token
}

fn cookie_domain_from_origin(origin: Option<&str>) -> Option<&'static str> {
    // TODO: do not hardcode the domain
    let origin = origin?;
    if origin.ends_with("boluochat.com") {
        Some(".boluochat.com")
    } else if origin.ends_with("boluo.chat") {
        Some(".boluo.chat")
    } else if origin.ends_with("boluo-staging.mythal.net") {
        Some(".boluo-staging.mythal.net")
    } else {
        None
    }
}

pub fn add_csrf_cookie(
    origin: Option<&str>,
    token: &str,
    is_debug: bool,
    response_header: &mut HeaderMap<HeaderValue>,
) {
    use cookie::time::Duration;
    use cookie::{CookieBuilder, SameSite};
    use hyper::header::SET_COOKIE;

    let mut builder = CookieBuilder::new(CSRF_COOKIE_KEY, token.to_string())
        .same_site(SameSite::Lax)
        .secure(!is_debug)
        .http_only(false)
        .path("/")
        .max_age(Duration::days(120));

    if let Some(domain) = cookie_domain_from_origin(origin) {
        builder = builder.domain(domain);
    }

    let csrf_cookie = builder.build().to_string();
    response_header.append(SET_COOKIE, HeaderValue::from_str(&csrf_cookie).unwrap());
}

pub fn remove_csrf_cookie(headers: &mut HeaderMap<HeaderValue>) {
    use cookie::CookieBuilder;
    use cookie::time::Duration;
    use hyper::header::SET_COOKIE;
    use std::sync::OnceLock;

    static SET_COOKIE_LIST_CELL: OnceLock<Vec<HeaderValue>> = OnceLock::new();
    let set_cookie_list = SET_COOKIE_LIST_CELL.get_or_init(|| {
        let zero = Duration::seconds(0);
        let domain_list = [".boluo.chat", ".boluochat.com", ".boluo-staging.mythal.net"];
        let mut cookies: Vec<HeaderValue> = domain_list
            .iter()
            .map(|&domain| {
                HeaderValue::from_str(
                    &CookieBuilder::new(CSRF_COOKIE_KEY, "")
                        .domain(domain)
                        .path("/")
                        .max_age(zero)
                        .build()
                        .to_string(),
                )
                .unwrap()
            })
            .collect();

        cookies.push(
            HeaderValue::from_str(
                &CookieBuilder::new(CSRF_COOKIE_KEY, "")
                    .path("/")
                    .max_age(zero)
                    .build()
                    .to_string(),
            )
            .unwrap(),
        );
        cookies
    });

    for cookie in set_cookie_list {
        headers.append(SET_COOKIE, cookie.clone());
    }
}

pub async fn get_csrf_token(
    _ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<hyper::Response<Vec<u8>>, AppError> {
    let origin = req
        .headers()
        .get(hyper::header::ORIGIN)
        .and_then(|x| x.to_str().ok())
        .map(|s| s.to_string());
    let is_debug = req.headers().get("X-Debug").is_some();

    let session_id = if let Ok(session) = session::authenticate(&req).await {
        session.id
    } else {
        Uuid::nil()
    };
    let token = generate_csrf_token(&session_id);

    let mut response = crate::interface::ok_response(token.clone());
    add_csrf_cookie(origin.as_deref(), &token, is_debug, response.headers_mut());
    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_csrf_token_unique() {
        let session_id = Uuid::new_v4();
        let token_1 = generate_csrf_token(&session_id);
        let token_2 = generate_csrf_token(&session_id);
        assert_ne!(token_1, token_2);
    }

    #[test]
    fn test_generate_csrf_token_invalid_for_other_session() {
        let session_a = Uuid::new_v4();
        let session_b = Uuid::new_v4();
        let token = generate_csrf_token(&session_a);

        let (nonce, signature) = token.split_once('.').expect("csrf token format");
        let message = csrf_sign_message(&session_b, nonce);

        assert!(verify(&message, signature).is_err());
    }
}
