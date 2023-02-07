use crate::cache;
use crate::error::AppError;
use crate::error::CacheError;
use crate::utils::{self, sign};
use anyhow::Context;
use hyper::header::HeaderValue;
use hyper::header::AUTHORIZATION;
use hyper::header::COOKIE;
use hyper::HeaderMap;
use regex::Regex;
use thiserror::Error;
use uuid::Uuid;

pub const SESSION_COOKIE_KEY: &str = "boluo-session-v1";
pub const SESSION_COOKIE_DOMAIN: &str = "boluo.chat";

#[derive(Error, Debug)]
pub enum AuthenticateFail {
    #[error("No authentication data found")]
    NoData,
    #[error("Invaild token format")]
    InvaildToken,
    #[error("Failed to verify the session")]
    CheckSignFail,
    #[error("No session found")]
    NoSessionFound,
}

pub fn token(session: &Uuid) -> String {
    // [body (base64)].[sign]
    let mut buffer = String::with_capacity(64);
    base64::encode_config_buf(session.as_bytes(), base64::STANDARD_NO_PAD, &mut buffer);
    let signature = sign(&buffer);
    buffer.push('.');
    base64::encode_config_buf(signature, base64::STANDARD_NO_PAD, &mut buffer);
    buffer
}

pub fn token_verify(token: &str) -> Result<Uuid, anyhow::Error> {
    let mut iter = token.split('.');
    let parse_failed = || anyhow::anyhow!("Failed to parse token: {}", token);
    let session = iter.next().ok_or_else(parse_failed)?;
    let signature = iter.next().ok_or_else(parse_failed)?;
    utils::verify(session, signature)?;
    let session = base64::decode(session).context("Failed to decode base64 in session.")?;
    Uuid::from_slice(session.as_slice()).context("Failed to convert session bytes data to UUID.")
}

pub async fn revoke_session(id: &Uuid) -> Result<(), CacheError> {
    let key = make_key(id);
    cache::conn().await.remove(&key).await
}

#[test]
fn test_session_sign() {
    let session = utils::id();
    assert!(token_verify("").is_err());
    let session_2 = token_verify(&token(&session)).unwrap();
    assert_eq!(session, session_2);
}

fn make_key(session: &Uuid) -> Vec<u8> {
    cache::make_key(b"sessions", session, b"user_id")
}

pub async fn start(user_id: &Uuid) -> Result<Uuid, CacheError> {
    let session = utils::id();
    let key = make_key(&session);
    cache::conn().await.set(&key, user_id.as_bytes()).await?;
    Ok(session)
}

#[derive(Debug)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
}

pub fn is_authenticate_use_cookie(headers: &HeaderMap<HeaderValue>) -> bool {
    !headers.contains_key(AUTHORIZATION)
}

pub async fn get_session_from_old_version_cookies(headers: &HeaderMap<HeaderValue>) -> Option<Session> {
    use std::sync::OnceLock;
    static COOKIE_PATTERN: OnceLock<Regex> = OnceLock::new();

    if headers.contains_key(AUTHORIZATION) {
        return None;
    }
    let value = headers.get(COOKIE)?.to_str().ok()?;
    let cookie_pattern = COOKIE_PATTERN.get_or_init(|| {
        let pattern = r"\bsession=([^;]+)".to_string();
        Regex::new(&pattern).unwrap()
    });
    let captures = cookie_pattern.captures(value)?;
    let token = captures.get(1)?.as_str();
    get_session_from_token(token).await.ok()
}

pub fn add_session_cookie(session: &Uuid, host: Option<&HeaderValue>, response_header: &mut HeaderMap<HeaderValue>) {
    use cookie::time::Duration;
    use cookie::{CookieBuilder, SameSite};
    use hyper::header::SET_COOKIE;

    let should_set_domain = host
        .and_then(|value| value.to_str().ok())
        .unwrap_or("boluo.chat")
        .to_lowercase()
        .ends_with(SESSION_COOKIE_DOMAIN);

    let token = token(session);
    let mut builder = CookieBuilder::new(SESSION_COOKIE_KEY, token)
        .same_site(SameSite::Lax)
        .secure(should_set_domain)
        .http_only(true)
        .path("/")
        .max_age(Duration::days(30));

    if should_set_domain {
        builder = builder.domain(SESSION_COOKIE_DOMAIN);
    }
    let session_cookie = builder.finish().to_string();
    response_header.append(SET_COOKIE, HeaderValue::from_str(&session_cookie).unwrap());
}

pub async fn remove_session(id: Uuid) -> Result<(), CacheError> {
    let key = make_key(&id);
    cache::conn().await.remove(&key).await?;
    Ok(())
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
                    .domain(SESSION_COOKIE_DOMAIN)
                    .path("/")
                    .max_age(zero)
                    .finish()
                    .to_string(),
            )
            .unwrap(),
            HeaderValue::from_str(
                &CookieBuilder::new(SESSION_COOKIE_KEY, "")
                    .http_only(true)
                    .path("/")
                    .max_age(zero)
                    .finish()
                    .to_string(),
            )
            .unwrap(),
            HeaderValue::from_str(
                &CookieBuilder::new("session", "")
                    .http_only(true)
                    .path("/api/")
                    .max_age(zero)
                    .finish()
                    .to_string(),
            )
            .unwrap(),
            HeaderValue::from_str(
                &CookieBuilder::new("session", "")
                    .http_only(true)
                    .path("/")
                    .max_age(zero)
                    .finish()
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

async fn get_session_from_token(token: &str) -> Result<Session, AppError> {
    let id = match token_verify(token) {
        Err(err) => {
            log::warn!("Failed to verify the token: {} error: {}", token, err);
            return Err(AuthenticateFail::CheckSignFail.into());
        }
        Ok(id) => id,
    };

    let key = make_key(&id);
    let bytes: Vec<u8> = cache::conn().await.get(&key).await?.ok_or_else(|| {
        log::warn!("Session {} not found, token: {}", id, token);
        AuthenticateFail::NoSessionFound
    })?;

    let user_id = Uuid::from_slice(&bytes).map_err(|_| AuthenticateFail::InvaildToken)?;
    Ok(Session { id, user_id })
}

pub async fn authenticate(req: &hyper::Request<hyper::Body>) -> Result<Session, AppError> {
    let headers = req.headers();
    let authorization = headers.get(AUTHORIZATION).map(HeaderValue::to_str);

    let token = if let Some(Ok(t)) = authorization {
        t
    } else {
        let cookie = headers.get(COOKIE).ok_or(AuthenticateFail::NoData)?;
        match parse_cookie(cookie) {
            Ok(None) => return Err(AuthenticateFail::NoData.into()),
            Ok(Some(token)) => token,
            Err(err) => {
                log::warn!(
                    "Failed to parse the cookie: {} error: {}",
                    cookie.to_str().unwrap_or("[Failed convert the cookie to string]"),
                    err
                );
                return Err(AuthenticateFail::InvaildToken.into());
            }
        }
    };
    get_session_from_token(token).await
}
