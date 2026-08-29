use std::ffi::CStr;
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
const HEAP_PROFILE_PATH: &str = "/tmp/boluo-jemalloc.heap";
const HEAP_PROFILE_PATH_C: &CStr = c"/tmp/boluo-jemalloc.heap";
const JEMALLOC_PURGE_ALL_ARENAS: &CStr = c"arena.4096.purge";

static TOKEN_COMPARISON_KEY: LazyLock<hmac::Key> = LazyLock::new(|| {
    let mut key = [0_u8; TOKEN_BYTES];
    SystemRandom::new()
        .fill(&mut key)
        .expect("failed to generate maintenance token comparison key");
    hmac::Key::new(hmac::HMAC_SHA256, &key)
});
static MAINTENANCE_TOKEN: LazyLock<RwLock<MaintenanceToken>> =
    LazyLock::new(|| RwLock::new(MaintenanceToken::generate(today())));
static ALLOCATOR_MAINTENANCE_ACTIVE: AtomicBool = AtomicBool::new(false);

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

struct AllocatorMaintenanceGuard;

impl AllocatorMaintenanceGuard {
    fn acquire() -> Result<Self, AppError> {
        ALLOCATOR_MAINTENANCE_ACTIVE
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map(|_| Self)
            .map_err(|_| AppError::Conflict("Allocator maintenance already in progress".to_owned()))
    }
}

impl Drop for AllocatorMaintenanceGuard {
    fn drop(&mut self) {
        ALLOCATOR_MAINTENANCE_ACTIVE.store(false, Ordering::Release);
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MemorySnapshot {
    rss_bytes: Option<u64>,
    anonymous_bytes: Option<u64>,
    allocator: crate::server_metrics::AllocatorMemorySnapshot,
}

impl MemorySnapshot {
    fn capture() -> Result<Self, tikv_jemalloc_ctl::Error> {
        let process = crate::server_metrics::get_process_memory_snapshot();
        Ok(Self {
            rss_bytes: process.as_ref().map(|snapshot| snapshot.rss_bytes),
            anonymous_bytes: process.as_ref().map(|snapshot| snapshot.anonymous_bytes),
            allocator: crate::server_metrics::get_allocator_memory_snapshot()?,
        })
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AllocatorCollectResponse {
    duration_ms: u64,
    before: MemorySnapshot,
    after: MemorySnapshot,
}

fn jemalloc_ctl_void(name: &CStr) -> std::io::Result<()> {
    // SAFETY: The selected void controls take no values.
    let result = unsafe {
        tikv_jemalloc_sys::mallctl(
            name.as_ptr(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            0,
        )
    };
    if result == 0 {
        Ok(())
    } else {
        Err(std::io::Error::from_raw_os_error(result))
    }
}

async fn collect_allocator() -> Result<Response, AppError> {
    let guard = AllocatorMaintenanceGuard::acquire()?;
    tracing::info!(
        event = "maintenance.allocator_collect.started",
        "Forced allocator collection started"
    );
    let result = tokio::task::spawn_blocking(move || -> anyhow::Result<_> {
        let _guard = guard;
        let before = MemorySnapshot::capture()?;
        let started_at = Instant::now();
        jemalloc_ctl_void(JEMALLOC_PURGE_ALL_ARENAS)?;
        let duration_ms = started_at.elapsed().as_millis() as u64;
        let after = MemorySnapshot::capture()?;
        Ok(AllocatorCollectResponse {
            duration_ms,
            before,
            after,
        })
    })
    .await
    .map_err(AppError::unexpected)?
    .map_err(|error| AppError::Unexpected(error))?;

    tracing::info!(
        event = "maintenance.allocator_collect.completed",
        duration_ms = result.duration_ms,
        rss_before = result.before.rss_bytes,
        rss_after = result.after.rss_bytes,
        anonymous_before = result.before.anonymous_bytes,
        anonymous_after = result.after.anonymous_bytes,
        allocator_allocated_before = result.before.allocator.allocated_bytes,
        allocator_allocated_after = result.after.allocator.allocated_bytes,
        allocator_resident_before = result.before.allocator.resident_bytes,
        allocator_resident_after = result.after.allocator.resident_bytes,
        "Forced allocator collection completed"
    );
    Ok(ok_response(result))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AllocatorProfileStatus {
    enabled: bool,
    active: bool,
}

fn allocator_profile_status() -> Result<AllocatorProfileStatus, tikv_jemalloc_ctl::Error> {
    // SAFETY: `opt.prof` returns a bool value.
    let enabled = unsafe { tikv_jemalloc_ctl::raw::read(b"opt.prof\0")? };
    let active = if enabled {
        // SAFETY: `prof.active` returns a bool value when profiling is enabled.
        unsafe { tikv_jemalloc_ctl::raw::read(b"prof.active\0")? }
    } else {
        false
    };
    Ok(AllocatorProfileStatus { enabled, active })
}

fn set_allocator_profile_active(active: bool) -> Result<AllocatorProfileStatus, AppError> {
    let status = allocator_profile_status().map_err(AppError::unexpected)?;
    if !status.enabled {
        return Err(AppError::Conflict(
            "jemalloc profiling was not enabled at startup".to_owned(),
        ));
    }
    if active && !status.active {
        jemalloc_ctl_void(c"prof.reset").map_err(AppError::unexpected)?;
    }
    // SAFETY: `prof.active` accepts a bool value.
    unsafe { tikv_jemalloc_ctl::raw::write(b"prof.active\0", active) }
        .map_err(AppError::unexpected)?;
    allocator_profile_status().map_err(AppError::unexpected)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AllocatorProfileDump {
    path: &'static str,
    bytes: u64,
}

async fn dump_allocator_profile() -> Result<Response, AppError> {
    if !allocator_profile_status()
        .map_err(AppError::unexpected)?
        .enabled
    {
        return Err(AppError::Conflict(
            "jemalloc profiling was not enabled at startup".to_owned(),
        ));
    }
    let guard = AllocatorMaintenanceGuard::acquire()?;
    let dump = tokio::task::spawn_blocking(move || -> anyhow::Result<_> {
        let _guard = guard;
        // SAFETY: `prof.dump` accepts a pointer to a NUL-terminated path for this call.
        unsafe { tikv_jemalloc_ctl::raw::write(b"prof.dump\0", HEAP_PROFILE_PATH_C.as_ptr()) }?;
        let bytes = std::fs::metadata(HEAP_PROFILE_PATH)?.len();
        Ok(AllocatorProfileDump {
            path: HEAP_PROFILE_PATH,
            bytes,
        })
    })
    .await
    .map_err(AppError::unexpected)?
    .map_err(|error| AppError::Unexpected(error))?;
    tracing::info!(
        event = "maintenance.allocator_profile.dumped",
        path = dump.path,
        bytes = dump.bytes,
        "jemalloc heap profile dumped"
    );
    Ok(ok_response(dump))
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
        ("/allocator/profile", &Method::GET) => {
            require_maintenance_token(req.headers())?;
            Ok(ok_response(
                allocator_profile_status().map_err(AppError::unexpected)?,
            ))
        }
        ("/allocator/profile", _) => Err(AppError::MethodNotAllowed),
        ("/allocator/profile/start", &Method::POST) => {
            require_maintenance_token(req.headers())?;
            Ok(ok_response(set_allocator_profile_active(true)?))
        }
        ("/allocator/profile/start", _) => Err(AppError::MethodNotAllowed),
        ("/allocator/profile/stop", &Method::POST) => {
            require_maintenance_token(req.headers())?;
            Ok(ok_response(set_allocator_profile_active(false)?))
        }
        ("/allocator/profile/stop", _) => Err(AppError::MethodNotAllowed),
        ("/allocator/profile/dump", &Method::POST) => {
            require_maintenance_token(req.headers())?;
            dump_allocator_profile().await
        }
        ("/allocator/profile/dump", _) => Err(AppError::MethodNotAllowed),
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
        let guard = AllocatorMaintenanceGuard::acquire().expect("first collection starts");
        assert!(AllocatorMaintenanceGuard::acquire().is_err());
        drop(guard);
        assert!(AllocatorMaintenanceGuard::acquire().is_ok());
    }
}
