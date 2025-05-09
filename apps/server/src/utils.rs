use anyhow::Context;
use chrono::prelude::*;
use hyper::body::Body;
use hyper::header::HeaderName;
use hyper::Request;
use ring::hmac;
use ring::rand::SecureRandom;
use std::sync::OnceLock as OnceCell;
use uuid::Uuid;

use crate::error::AppError;

macro_rules! regex {
    ($pattern: expr) => {{
        use regex::Regex;
        use std::sync::OnceLock;
        static CELL: OnceLock<Regex> = OnceLock::new();
        CELL.get_or_init(|| Regex::new($pattern).unwrap())
    }};
}

pub fn id() -> Uuid {
    use uuid::v1::Context as UuidContext;
    use uuid::v1::Timestamp;

    static NODE_ID: OnceCell<[u8; 6]> = OnceCell::new();
    let node_id = NODE_ID.get_or_init(|| {
        let rng = ring::rand::SystemRandom::new();
        let mut id = [0u8; 6];
        rng.fill(&mut id).unwrap();
        id
    });
    let now = Utc::now();
    static CONTEXT: UuidContext = UuidContext::new(0);
    let timestamp = Timestamp::from_unix(
        &CONTEXT,
        now.timestamp() as u64,
        now.timestamp_subsec_nanos(),
    );
    Uuid::new_v1(timestamp, node_id)
}

fn key() -> &'static hmac::Key {
    use crate::context::secret;
    use ring::digest;
    static KEY: OnceCell<hmac::Key> = OnceCell::new();
    KEY.get_or_init(|| {
        let digest = digest::digest(&digest::SHA256, secret().as_bytes());
        hmac::Key::new(hmac::HMAC_SHA256, digest.as_ref())
    })
}

pub fn whitespace_only<T: AsRef<str>>(s: &T) -> bool {
    s.as_ref().trim().is_empty()
}

pub fn not_whitespace_only<T: AsRef<str>>(s: &T) -> bool {
    !whitespace_only(s)
}

pub fn sign(message: &str) -> hmac::Tag {
    hmac::sign(key(), message.as_bytes())
}

pub fn sha1(data: &[u8]) -> ring::digest::Digest {
    ring::digest::digest(&ring::digest::SHA1_FOR_LEGACY_USE_ONLY, data)
}

pub fn verify(message: &str, signature: &str) -> Result<(), anyhow::Error> {
    use base64::{engine::general_purpose, Engine as _};

    let signature = signature.trim();

    let signature = general_purpose::STANDARD_NO_PAD
        .decode(signature)
        .or_else(|_| general_purpose::STANDARD.decode(signature))
        .context("Failed to decode signature")?;
    hmac::verify(key(), message.as_bytes(), &signature)
        .map_err(|_| anyhow::anyhow!("Failed to verify signature of message {}", message))
}

pub fn timestamp() -> i64 {
    Utc::now().timestamp_millis()
}

pub fn inner_map<T, E, U, F: Fn(T) -> U>(
    x: Result<Option<T>, E>,
    mapper: F,
) -> Result<Option<U>, E> {
    x.map(|y| y.map(mapper))
}

pub fn inner_result_map<T, E, U, F: Fn(T) -> Result<U, E>>(
    x: Result<Option<T>, E>,
    mapper: F,
) -> Result<Option<U>, E> {
    match x {
        Ok(Some(x)) => mapper(x).map(|value| Some(value)),
        Ok(None) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn merge_blank(s: &str) -> String {
    regex!(r"\s+").replace_all(s, " ").trim().to_string()
}

#[test]
fn test_sign() {
    use base64::{engine::general_purpose::STANDARD as base64_engine, Engine as _};

    let message = "hello, world";
    let signature = sign(message);
    let signature = base64_engine.encode(signature);
    verify(message, &signature).unwrap();
}

pub fn get_ip(req: &Request<impl Body>) -> Result<std::net::IpAddr, AppError> {
    let real_ip = HeaderName::from_lowercase(b"x-real-ip").unwrap();
    let forwarded_for = HeaderName::from_lowercase(b"x-forwarded-for").unwrap();
    let headers = req.headers();
    let invalid = "Invalid IP address in headers";
    let no_ip = "No IP found in headers";
    let ip_in_header = if let Some(real_ip) = headers.get(real_ip) {
        real_ip
            .to_str()
            .map_err(|_| AppError::BadRequest(invalid.to_string()))?
    } else {
        let header_value = headers
            .get(forwarded_for)
            .ok_or_else(|| AppError::BadRequest("No IP found in headers".to_string()))?
            .to_str()
            .map_err(|_| AppError::BadRequest(invalid.to_string()))?;
        header_value
            .split(',')
            .next()
            .ok_or_else(|| AppError::BadRequest(no_ip.to_string()))?
    };

    ip_in_header
        .trim()
        .parse()
        .map_err(|_| AppError::BadRequest(invalid.to_string()))
}

#[test]
fn test_get_ip() {
    let mut req = Request::builder()
        .header("x-real-ip", "192.168.1.1")
        .body(String::new())
        .unwrap();
    assert_eq!(
        get_ip(&req).ok(),
        "192.168.1.1".parse().ok(),
        "Should extract IP from x-real-ip header"
    );

    req = Request::builder()
        .header("x-forwarded-for", "10.0.0.1, 192.168.1.1")
        .body(String::new())
        .unwrap();
    assert_eq!(
        get_ip(&req).ok(),
        "10.0.0.1".parse().ok(),
        "Should extract IP from x-forwarded-for header"
    );

    req = Request::builder().body(String::new()).unwrap();
    assert!(
        get_ip(&req).is_err(),
        "Should return error if no IP is found"
    );
}

pub struct MessageRng {
    x: f64,
}

impl MessageRng {
    pub fn new(seed: Vec<u8>) -> MessageRng {
        let mut x: f64 = 0.0;
        for i in seed {
            x = x * 256.0 + i as f64;
        }
        MessageRng { x }
    }

    fn next(&mut self) {
        let mut x = self.x as i32;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.x = x as f64;
    }

    pub fn next_i32(&mut self, min: i32, max: i32) -> i32 {
        self.next();
        MessageRng::map(self.x, min as f64, max as f64 + 1.0).floor() as i32
    }

    fn map(x: f64, min: f64, max: f64) -> f64 {
        let i32_min = i32::MIN as f64;
        ((x - i32_min) / (i32::MAX as f64 - i32_min)) * (max - min) + min
    }
}

#[test]
fn rng_test() {
    let mut rng = MessageRng::new(vec![118, 53, 43, 110]);
    let result = rng.next_i32(1, 20);
    assert_eq!(result, 5);
    let result = rng.next_i32(1, 20);
    assert_eq!(result, 14);
    let result = rng.next_i32(1, 20);
    assert_eq!(result, 19);
    let result = rng.next_i32(1, 20);
    assert_eq!(result, 5);
}
