use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{LazyLock, RwLock};
use std::time::Instant;

use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hyper::body::Incoming;
use hyper::header::AUTHORIZATION;
use hyper::{HeaderMap, Method, Request};
use ring::hmac;
use ring::rand::{SecureRandom as _, SystemRandom};
use serde::Serialize;
use time::{Date, OffsetDateTime};

use crate::error::AppError;
use crate::interface::{Response, ok_response};

const TOKEN_BYTES: usize = 32;

static TOKEN_COMPARISON_KEY: LazyLock<hmac::Key> = LazyLock::new(|| {
    let mut key = [0_u8; TOKEN_BYTES];
    SystemRandom::new()
        .fill(&mut key)
        .expect("failed to generate maintenance token comparison key");
    hmac::Key::new(hmac::HMAC_SHA256, &key)
});
static MAINTENANCE_TOKEN: LazyLock<RwLock<MaintenanceToken>> =
    LazyLock::new(|| RwLock::new(MaintenanceToken::generate(today())));
static ALLOCATOR_COLLECTING: AtomicBool = AtomicBool::new(false);

struct MaintenanceToken {
    date: Date,
    encoded: String,
    comparison_tag: hmac::Tag,
}

impl MaintenanceToken {
    fn generate(date: Date) -> Self {
        let mut bytes = [0_u8; TOKEN_BYTES];
        SystemRandom::new()
            .fill(&mut bytes)
            .expect("failed to generate maintenance token");
        let encoded = URL_SAFE_NO_PAD.encode(bytes);
        let comparison_tag = hmac::sign(&TOKEN_COMPARISON_KEY, encoded.as_bytes());
        Self {
            date,
            encoded,
            comparison_tag,
        }
    }
}

fn today() -> Date {
    OffsetDateTime::now_utc().date()
}

fn rotate_token_if_needed() {
    let date = today();
    if MAINTENANCE_TOKEN
        .read()
        .expect("maintenance token lock poisoned")
        .date
        == date
    {
        return;
    }

    let mut token = MAINTENANCE_TOKEN
        .write()
        .expect("maintenance token lock poisoned");
    if token.date != date {
        *token = MaintenanceToken::generate(date);
        log_token(&token);
    }
}

fn log_token(token: &MaintenanceToken) {
    tracing::info!(
        event = "maintenance.token_rotated",
        valid_date = %token.date,
        maintenance_token = %token.encoded,
        "Maintenance token generated"
    );
}

pub(crate) fn start_token_rotation() {
    {
        let token = MAINTENANCE_TOKEN
            .read()
            .expect("maintenance token lock poisoned");
        log_token(&token);
    }
    tokio::spawn(async {
        let mut interval = crate::utils::cleaner_interval(60);
        loop {
            tokio::select! {
                _ = interval.tick() => rotate_token_if_needed(),
                _ = crate::shutdown::SHUTDOWN.notified() => break,
            }
        }
    });
}

fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
        .filter(|token| !token.is_empty())
}

fn require_maintenance_token(headers: &HeaderMap) -> Result<(), AppError> {
    rotate_token_if_needed();
    let supplied = bearer_token(headers)
        .ok_or_else(|| AppError::NoPermission("Maintenance token required".to_owned()))?;
    let token = MAINTENANCE_TOKEN
        .read()
        .expect("maintenance token lock poisoned");
    hmac::verify(
        &TOKEN_COMPARISON_KEY,
        supplied.as_bytes(),
        token.comparison_tag.as_ref(),
    )
    .map_err(|_| AppError::NoPermission("Invalid maintenance token".to_owned()))
}

struct AllocatorCollectGuard;

impl AllocatorCollectGuard {
    fn acquire() -> Result<Self, AppError> {
        ALLOCATOR_COLLECTING
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map(|_| Self)
            .map_err(|_| AppError::Conflict("Allocator collection already in progress".to_owned()))
    }
}

impl Drop for AllocatorCollectGuard {
    fn drop(&mut self) {
        ALLOCATOR_COLLECTING.store(false, Ordering::Release);
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MemorySnapshot {
    rss_bytes: Option<u64>,
    anonymous_bytes: Option<u64>,
    allocator_resident_bytes: u64,
    allocator_committed_bytes: u64,
}

impl MemorySnapshot {
    fn capture() -> Self {
        let process = crate::server_metrics::get_process_memory_snapshot();
        let allocator = crate::server_metrics::get_allocator_memory_snapshot();
        Self {
            rss_bytes: process.as_ref().map(|snapshot| snapshot.rss_bytes),
            anonymous_bytes: process.as_ref().map(|snapshot| snapshot.anonymous_bytes),
            allocator_resident_bytes: allocator.resident_bytes as u64,
            allocator_committed_bytes: allocator.committed_bytes as u64,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AllocatorCollectResponse {
    duration_ms: u64,
    before: MemorySnapshot,
    after: MemorySnapshot,
}

async fn collect_allocator() -> Result<Response, AppError> {
    let guard = AllocatorCollectGuard::acquire()?;
    tracing::info!(
        event = "maintenance.allocator_collect.started",
        "Forced allocator collection started"
    );
    let result = tokio::task::spawn_blocking(move || {
        let _guard = guard;
        let before = MemorySnapshot::capture();
        let started_at = Instant::now();
        // SAFETY: `mi_collect` is process-wide and takes no pointers. The single-flight guard
        // prevents overlapping forced collections initiated through this endpoint.
        unsafe { libmimalloc_sys::mi_collect(true) };
        let duration_ms = started_at.elapsed().as_millis() as u64;
        let after = MemorySnapshot::capture();
        AllocatorCollectResponse {
            duration_ms,
            before,
            after,
        }
    })
    .await
    .map_err(AppError::unexpected)?;

    tracing::info!(
        event = "maintenance.allocator_collect.completed",
        duration_ms = result.duration_ms,
        rss_before = result.before.rss_bytes,
        rss_after = result.after.rss_bytes,
        anonymous_before = result.before.anonymous_bytes,
        anonymous_after = result.after.anonymous_bytes,
        allocator_resident_before = result.before.allocator_resident_bytes,
        allocator_resident_after = result.after.allocator_resident_bytes,
        allocator_committed_before = result.before.allocator_committed_bytes,
        allocator_committed_after = result.after.allocator_committed_bytes,
        "Forced allocator collection completed"
    );
    Ok(ok_response(result))
}

pub(crate) async fn router(
    _ctx: &crate::context::AppContext,
    req: Request<Incoming>,
    path: &str,
) -> Result<Response, AppError> {
    match (path, req.method()) {
        ("/allocator/collect", &Method::POST) => {
            require_maintenance_token(req.headers())?;
            collect_allocator().await
        }
        ("/allocator/collect", _) => Err(AppError::MethodNotAllowed),
        _ => Err(AppError::missing()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maintenance_token_authentication_requires_the_current_bearer_token() {
        let encoded = MAINTENANCE_TOKEN
            .read()
            .expect("maintenance token lock poisoned")
            .encoded
            .clone();
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            format!("Bearer {encoded}").parse().expect("valid header"),
        );
        assert!(require_maintenance_token(&headers).is_ok());

        headers.insert(AUTHORIZATION, "Bearer invalid".parse().unwrap());
        assert!(require_maintenance_token(&headers).is_err());
        assert!(require_maintenance_token(&HeaderMap::new()).is_err());
    }

    #[test]
    fn allocator_collection_is_single_flight() {
        let guard = AllocatorCollectGuard::acquire().expect("first collection starts");
        assert!(AllocatorCollectGuard::acquire().is_err());
        drop(guard);
        assert!(AllocatorCollectGuard::acquire().is_ok());
    }
}
