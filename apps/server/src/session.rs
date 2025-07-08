use crate::cache::{CACHE, CacheType};
use crate::context::domain;
use crate::error::AppError;
use crate::ttl::{Lifespan, fetch_entry, hour};
use crate::utils::{self, sign};
use anyhow::Context;
use hyper::HeaderMap;
use hyper::header::AUTHORIZATION;
use hyper::header::COOKIE;
use hyper::header::HeaderValue;
use regex::Regex;
use thiserror::Error;
use uuid::Uuid;

pub const SESSION_COOKIE_KEY: &str = "boluo-session-v2";

#[derive(Debug, Clone, Copy)]
pub struct Session {
    pub user_id: Uuid,
    pub id: Uuid,
    pub created: chrono::DateTime<chrono::Utc>,
}

impl Lifespan for Session {
    fn ttl_sec() -> u64 {
        hour::ONE
    }
}

#[derive(Error, Debug)]
pub enum AuthenticateFail {
    #[error("No credentials provided")]
    Guest,
    #[error("Invalid token format")]
    MalformedToken,
    #[error("Failed to verify the session")]
    CheckSignFail,
    #[error("Can not find the session")]
    NoSessionFound,
}

pub fn token(session_id: &Uuid) -> String {
    use base64::{Engine as _, engine::general_purpose::STANDARD_NO_PAD as base64_engine};
    // [body (base64)].[sign]
    let mut buffer = String::with_capacity(64);
    base64_engine.encode_string(session_id.as_bytes(), &mut buffer);
    let signature = sign(&buffer);
    buffer.push('.');
    base64_engine.encode_string(signature, &mut buffer);
    buffer
}

pub fn token_verify(token: &str) -> Result<Uuid, anyhow::Error> {
    use base64::{Engine as _, engine::general_purpose};

    let mut iter = token.split('.');
    let parse_failed = || anyhow::anyhow!("Failed to parse token: {}", token);
    let session_id_str = iter.next().ok_or_else(parse_failed)?;
    let signature = iter.next().ok_or_else(parse_failed)?;
    utils::verify(session_id_str, signature)?;
    let session_id_byte = general_purpose::STANDARD_NO_PAD
        .decode(session_id_str)
        .or_else(|_| general_purpose::STANDARD.decode(session_id_str))
        .context("Failed to decode base64 in session.")?;
    Uuid::from_slice(session_id_byte.as_slice())
        .context("Failed to convert session bytes data to UUID.")
}

pub async fn revoke_session(session_id: Uuid) -> Result<(), sqlx::Error> {
    let mut conn = crate::db::get().await.acquire().await?;
    sqlx::query_file!("sql/users/session_revoke.sql", session_id)
        .execute(&mut *conn)
        .await?;
    CACHE.invalidate(CacheType::Session, session_id).await;
    Ok(())
}

#[test]
fn test_session_sign() {
    let session = utils::id();
    assert!(token_verify("").is_err());
    let session_2 = token_verify(&token(&session)).unwrap();
    assert_eq!(session, session_2);
}

pub async fn start_with_session_id(
    user_id: Uuid,
    session_id: Uuid,
) -> Result<Session, sqlx::Error> {
    let mut conn = crate::db::get().await.acquire().await?;
    sqlx::query_file_as!(
        Session,
        "sql/users/session_start.sql",
        &session_id,
        &user_id
    )
    .fetch_one(&mut *conn)
    .await
}
pub async fn start(user_id: Uuid) -> Result<Session, sqlx::Error> {
    let session_id = Uuid::new_v4();
    let session = start_with_session_id(user_id, session_id).await?;
    CACHE.Session.insert(session_id, session.into());
    Ok(session)
}

pub fn is_authenticate_use_cookie(headers: &HeaderMap<HeaderValue>) -> bool {
    !headers.contains_key(AUTHORIZATION)
}

pub fn add_session_cookie(
    session: &Uuid,
    is_debug: bool,
    response_header: &mut HeaderMap<HeaderValue>,
) {
    use cookie::time::Duration;
    use cookie::{CookieBuilder, SameSite};
    use hyper::header::SET_COOKIE;

    let token = token(session);
    let mut builder = CookieBuilder::new(SESSION_COOKIE_KEY, token)
        .same_site(SameSite::Lax)
        .secure(!is_debug)
        .http_only(true)
        .path("/")
        .max_age(Duration::days(30));

    let session_cookie_domain = domain();
    if !is_debug && !session_cookie_domain.is_empty() {
        builder = builder.domain(session_cookie_domain);
    }
    let session_cookie = builder.build().to_string();
    response_header.append(SET_COOKIE, HeaderValue::from_str(&session_cookie).unwrap());
}

pub fn add_settings_cookie(
    settings: &serde_json::Value,
    response_header: &mut HeaderMap<HeaderValue>,
) {
    use cookie::CookieBuilder;
    use cookie::time::Duration;
    use hyper::header::SET_COOKIE;

    if settings.is_null() || !settings.is_object() {
        return;
    }
    let max_age = Duration::days(10 * 365);
    if let Some(locale) = settings.get("locale") {
        if locale.is_string() {
            let locale = locale.as_str().expect("Failed to get locale string.");
            let cookie = CookieBuilder::new("boluo-locale", locale)
                .path("/")
                .max_age(max_age)
                .build()
                .to_string();
            response_header.append(
                SET_COOKIE,
                HeaderValue::from_str(&cookie).expect("Failed to convert cookie to header value."),
            );
        }
    }
    if let Some(theme) = settings.get("theme") {
        if theme.is_string() {
            let theme = theme.as_str().expect("Failed to get theme string.");
            let cookie = CookieBuilder::new("boluo-theme", theme)
                .path("/")
                .max_age(max_age)
                .build()
                .to_string();
            response_header.append(
                SET_COOKIE,
                HeaderValue::from_str(&cookie).expect("Failed to convert cookie to header value."),
            );
        }
    }
}

pub fn remove_session_cookie(headers: &mut HeaderMap<HeaderValue>) {
    use cookie::CookieBuilder;
    use cookie::time::Duration;
    use hyper::header::SET_COOKIE;
    use std::sync::OnceLock;
    static SET_COOKIE_LIST_CELL: OnceLock<Vec<HeaderValue>> = OnceLock::new();
    let set_cookie_list = SET_COOKIE_LIST_CELL.get_or_init(|| {
        let zero = Duration::seconds(0);
        vec![
            HeaderValue::from_str(
                &CookieBuilder::new(SESSION_COOKIE_KEY, "")
                    .http_only(true)
                    .domain(domain())
                    .path("/")
                    .max_age(zero)
                    .build()
                    .to_string(),
            )
            .unwrap(),
            HeaderValue::from_str(
                &CookieBuilder::new(SESSION_COOKIE_KEY, "")
                    .http_only(true)
                    .path("/")
                    .max_age(zero)
                    .build()
                    .to_string(),
            )
            .unwrap(),
            HeaderValue::from_str(
                &CookieBuilder::new("session", "")
                    .http_only(true)
                    .path("/api/")
                    .max_age(zero)
                    .build()
                    .to_string(),
            )
            .unwrap(),
            HeaderValue::from_str(
                &CookieBuilder::new("session", "")
                    .http_only(true)
                    .path("/")
                    .max_age(zero)
                    .build()
                    .to_string(),
            )
            .unwrap(),
        ]
    });
    for cookie in set_cookie_list {
        headers.append(SET_COOKIE, cookie.clone());
    }
}

fn parse_cookie(value: &hyper::header::HeaderValue) -> Option<&str> {
    use std::sync::OnceLock;
    static COOKIE_PATTERN: OnceLock<Regex> = OnceLock::new();
    let cookie_pattern = COOKIE_PATTERN.get_or_init(|| {
        let pattern = format!(r"(?:^|;\s*){SESSION_COOKIE_KEY}=([^;]+)");
        Regex::new(&pattern).unwrap()
    });
    let value = match value.to_str() {
        Ok(value) => value,
        Err(_) => {
            tracing::warn!("Failed to convert cookie to string");
            return None;
        }
    };
    let capture = cookie_pattern.captures(value)?;
    Some(capture.get(1)?.as_str())
}

#[tracing::instrument]
async fn get_session_from_db(session_id: Uuid) -> Result<Session, AppError> {
    let mut conn = crate::db::get().await.acquire().await?;
    let session = sqlx::query_file_as!(Session, "sql/users/session_fetch.sql", session_id)
        .fetch_optional(&mut *conn)
        .await
        .map_err(|err| {
            tracing::warn!(error = %err, "Database error while fetching session");
            AppError::Db { source: err }
        })?;
    session.ok_or(AuthenticateFail::NoSessionFound.into())
}

async fn get_session_from_token(token: &str) -> Result<Session, AppError> {
    let session_id = match token_verify(token) {
        Err(err) => {
            tracing::warn!(error = %err, "Failed to verify the token: {}", token);
            return Err(AuthenticateFail::CheckSignFail.into());
        }
        Ok(id) => id,
    };

    fetch_entry(&CACHE.Session, session_id, async {
        get_session_from_db(session_id).await
    })
    .await
}

pub async fn authenticate_with_cookie(
    headers: &HeaderMap<HeaderValue>,
) -> Result<Session, AppError> {
    tracing::Span::current().record("auth_method", "cookie");
    let cookie = headers.get(COOKIE).ok_or(AuthenticateFail::Guest)?;
    let token = parse_cookie(cookie).ok_or(AuthenticateFail::Guest)?;
    get_session_from_token(token).await
}

pub async fn authenticate(
    req: &hyper::Request<impl hyper::body::Body>,
) -> Result<Session, AppError> {
    let headers = req.headers();

    let session = if let Some(header_value) = headers.get(AUTHORIZATION) {
        if let Ok(authorization) = header_value.to_str() {
            let span = tracing::Span::current();
            let token = authorization.trim_start_matches("Bearer ").trim();
            let session = get_session_from_token(token).await;
            if let Ok(session) = session {
                span.record("auth_method", "bearer_token");
                Ok(session)
            } else {
                // TODO: check if this fallback is needed
                tracing::warn!("Failed to authenticate with bearer token, fallback to cookie");
                authenticate_with_cookie(headers).await
            }
        } else {
            tracing::warn!("Failed to convert header value to string, fallback to cookie");
            authenticate_with_cookie(headers).await
        }
    } else {
        authenticate_with_cookie(headers).await
    };
    let session = session?;
    let span = tracing::Span::current();
    span.record("user_id", tracing::field::display(session.user_id));
    tracing::debug!(
        user_id = %session.user_id,
        session_id = %session.id,
        "User authenticated successfully"
    );
    return Ok(session);
}

#[cfg(test)]
mod tests {
    use super::*;
    use hyper::header::HeaderValue;

    #[test]
    fn test_parse_cookie_basic() {
        let cookie_value = HeaderValue::from_static("boluo-session-v2=test-token-123");
        let result = parse_cookie(&cookie_value);
        assert!(result.is_some());
        assert_eq!(result, Some("test-token-123"));
    }

    #[test]
    fn test_parse_cookie_with_multiple_cookies() {
        let cookie_value = HeaderValue::from_static(
            "other=value; boluo-session-v2=test-token-456; another=value2",
        );
        let result = parse_cookie(&cookie_value);
        assert!(result.is_some());
        assert_eq!(result, Some("test-token-456"));
    }

    #[test]
    fn test_parse_cookie_at_beginning() {
        let cookie_value = HeaderValue::from_static("boluo-session-v2=first-token; other=value");
        let result = parse_cookie(&cookie_value);
        assert!(result.is_some());
        assert_eq!(result, Some("first-token"));
    }

    #[test]
    fn test_parse_cookie_at_end() {
        let cookie_value = HeaderValue::from_static("other=value; boluo-session-v2=last-token");
        let result = parse_cookie(&cookie_value);
        assert!(result.is_some());
        assert_eq!(result, Some("last-token"));
    }

    #[test]
    fn test_parse_cookie_not_found() {
        let cookie_value = HeaderValue::from_static("other=value; another=value2");
        let result = parse_cookie(&cookie_value);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_cookie_empty() {
        let cookie_value = HeaderValue::from_static("");
        let result = parse_cookie(&cookie_value);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_cookie_similar_name() {
        let cookie_value =
            HeaderValue::from_static("test-boluo-session-v2=wrong; boluo-session-v2=correct");
        let result = parse_cookie(&cookie_value);
        assert!(result.is_some());
        assert_eq!(result, Some("correct"));
    }

    #[test]
    fn test_parse_cookie_with_spaces() {
        let cookie_value =
            HeaderValue::from_static("boluo-session-v2=token with spaces and symbols!@#");
        let result = parse_cookie(&cookie_value);
        assert!(result.is_some());
        assert_eq!(result, Some("token with spaces and symbols!@#"));
    }

    #[test]
    fn test_parse_cookie_with_equals_in_value() {
        let cookie_value =
            HeaderValue::from_static("boluo-session-v2=token=with=equals; other=value");
        let result = parse_cookie(&cookie_value);
        assert!(result.is_some());
        assert_eq!(result, Some("token=with=equals"));
    }

    #[test]
    fn test_parse_cookie_no_space_separator() {
        let cookie_value = HeaderValue::from_static("other=value;boluo-session-v2=no-space-token");
        let result = parse_cookie(&cookie_value);
        assert!(result.is_some());
        assert_eq!(result, Some("no-space-token"));
    }

    #[test]
    fn test_parse_cookie_regex_edge_cases() {
        let test_cases = vec![
            ("prefix-boluo-session-v2=should-not-match", None),
            ("boluo-session-v2-suffix=should-not-match", None),
            ("boluo-session-v2=", None),
            ("boluo-session-v2=value", Some("value")),
        ];

        for (input, expected) in test_cases {
            let cookie_value = HeaderValue::from_static(input);
            let result = parse_cookie(&cookie_value);
            assert_eq!(result, expected);
        }
    }
}
