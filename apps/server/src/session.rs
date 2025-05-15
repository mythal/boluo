use crate::cache::{CacheType, CACHE};
use crate::context::domain;
use crate::error::AppError;
use crate::ttl::{fetch_entry, hour, Lifespan};
use crate::utils::{self, sign};
use anyhow::Context;
use hyper::header::HeaderValue;
use hyper::header::AUTHORIZATION;
use hyper::header::COOKIE;
use hyper::HeaderMap;
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
    #[error("Credentials are expired")]
    NoSessionFound,
}

pub fn token(session_id: &Uuid) -> String {
    use base64::{engine::general_purpose::STANDARD_NO_PAD as base64_engine, Engine as _};
    // [body (base64)].[sign]
    let mut buffer = String::with_capacity(64);
    base64_engine.encode_string(session_id.as_bytes(), &mut buffer);
    let signature = sign(&buffer);
    buffer.push('.');
    base64_engine.encode_string(signature, &mut buffer);
    buffer
}

pub fn token_verify(token: &str) -> Result<Uuid, anyhow::Error> {
    use base64::{engine::general_purpose, Engine as _};

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
    CACHE.Session.insert(session_id, session.clone().into());
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
    if !is_debug {
        builder = builder.domain(session_cookie_domain);
    }
    let session_cookie = builder.build().to_string();
    response_header.append(SET_COOKIE, HeaderValue::from_str(&session_cookie).unwrap());
}

pub fn add_settings_cookie(
    settings: &serde_json::Value,
    response_header: &mut HeaderMap<HeaderValue>,
) {
    use cookie::time::Duration;
    use cookie::CookieBuilder;
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
    use cookie::time::Duration;
    use cookie::CookieBuilder;
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

fn parse_cookie(value: &hyper::header::HeaderValue) -> Result<Option<&str>, anyhow::Error> {
    use std::sync::OnceLock;
    static COOKIE_PATTERN: OnceLock<Regex> = OnceLock::new();
    let cookie_pattern = COOKIE_PATTERN.get_or_init(|| {
        let pattern = format!(r"\b{SESSION_COOKIE_KEY}=([^;]+)");
        Regex::new(&pattern).unwrap()
    });
    let value = value
        .to_str()
        .with_context(|| format!("Failed to convert {value:?} to string."))?;
    let capture = cookie_pattern.captures(value);
    if let Some(capture) = capture {
        capture
            .get(1)
            .map(|m| Some(m.as_str()))
            .ok_or_else(|| anyhow::anyhow!("Failed to parse cookie: {}", value))
    } else {
        Ok(None)
    }
}

async fn get_session_from_db(session_id: Uuid) -> Result<Session, AppError> {
    use redis::AsyncCommands;

    {
        let mut conn = crate::db::get().await.acquire().await?;
        let session = sqlx::query_file_as!(Session, "sql/users/session_fetch.sql", session_id)
            .fetch_optional(&mut *conn)
            .await
            .map_err(|err| {
                log::warn!("Database error while fetching session: {}", err);
                AppError::Unexpected(err.into())
            })?;
        if let Some(session) = session {
            return Ok(session);
        };
    }
    let Some(mut redis) = crate::redis::conn().await else {
        return Err(AppError::NotFound("session"));
    };
    let user_id: Uuid = redis
        .get::<_, Vec<u8>>(crate::redis::make_key(b"sessions", &session_id, b"user_id"))
        .await
        .map_err(|err| {
            log::warn!("Redis error while fetching session: {}", err);
            AppError::NotFound("session")
        })
        .and_then(|user_id| {
            if user_id.is_empty() {
                return Err(AppError::NotFound("session"));
            }
            Uuid::from_slice(&user_id).map_err(|err| {
                log::warn!("Failed to convert user_id bytes to UUID: {}", err);
                AppError::NotFound("session")
            })
        })?;

    start_with_session_id(user_id, session_id)
        .await
        .map_err(|_err: sqlx::Error| AppError::NotFound("session"))
}

async fn get_session_from_token(token: &str) -> Result<Session, AppError> {
    let session_id = match token_verify(token) {
        Err(err) => {
            log::warn!("Failed to verify the token: {} error: {}", token, err);
            return Err(AuthenticateFail::CheckSignFail.into());
        }
        Ok(id) => id,
    };

    fetch_entry(&CACHE.Session, session_id, async {
        get_session_from_db(session_id).await
    })
    .await
}

pub async fn authenticate(
    req: &hyper::Request<impl hyper::body::Body>,
) -> Result<Session, AppError> {
    let headers = req.headers();
    let authorization = headers.get(AUTHORIZATION).map(HeaderValue::to_str);

    let token = if let Some(Ok(t)) = authorization {
        t.trim_start_matches("Bearer ").trim()
    } else {
        let cookie = headers.get(COOKIE).ok_or(AuthenticateFail::Guest)?;
        match parse_cookie(cookie) {
            Ok(None) => return Err(AuthenticateFail::Guest.into()),
            Ok(Some(token)) => token,
            Err(err) => {
                log::warn!(
                    "Failed to parse the cookie: {} error: {}",
                    cookie
                        .to_str()
                        .unwrap_or("[Failed convert the cookie to string]"),
                    err
                );
                return Err(AuthenticateFail::MalformedToken.into());
            }
        }
    };
    get_session_from_token(token).await
}
