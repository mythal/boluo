//! A deliberately small receiver for the subset of Grafana Faro used by Boluo.
//!
//! Browser exceptions and warning/error logs become structured server logs,
//! while Web Vitals become metrics. Other Faro signals are ignored.

use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr};
use std::num::NonZeroU32;
use std::sync::{LazyLock, OnceLock};

use bytes::Bytes;
use governor::{DefaultDirectRateLimiter, DefaultKeyedRateLimiter, Quota, RateLimiter};
use hyper::body::Body;
use hyper::header::{CONTENT_ENCODING, CONTENT_TYPE};
use hyper::{Method, Request, StatusCode};
use serde::Deserialize;
use sonic_rs::{JsonType, JsonValueTrait, LazyValue};
use tokio::sync::mpsc;

use crate::error::AppError;
pub(crate) use crate::frontend_sourcemap::Config;
use crate::frontend_sourcemap::{Resolver as SourceMapResolver, StackFrame};
use crate::interface::{Response, read_body_limited};
use crate::rate_limit::Ipv6Prefix64;

const MAX_BODY_BYTES: usize = 64 * 1024;
const MAX_SIGNALS_PER_BATCH: usize = 10;
const MAX_MESSAGE_BYTES: usize = 2 * 1024;
const MAX_LOG_CONTEXT_BYTES: usize = 8 * 1024;
const MAX_STACKTRACE_BYTES: usize = 8 * 1024;
const MAX_EXCEPTION_SUMMARY_BYTES: usize = 160;
const TELEMETRY_QUEUE_CAPACITY: usize = 1024;

static GLOBAL_LIMITER: LazyLock<DefaultDirectRateLimiter> = LazyLock::new(|| {
    RateLimiter::direct(
        Quota::per_minute(NonZeroU32::new(600).unwrap()).allow_burst(NonZeroU32::new(100).unwrap()),
    )
});
static CLIENT_IPV4_LIMITER: LazyLock<DefaultKeyedRateLimiter<Ipv4Addr>> = LazyLock::new(|| {
    RateLimiter::keyed(
        Quota::per_minute(NonZeroU32::new(60).unwrap()).allow_burst(NonZeroU32::new(10).unwrap()),
    )
});
static CLIENT_IPV6_PREFIX_LIMITER: LazyLock<DefaultKeyedRateLimiter<Ipv6Prefix64>> =
    LazyLock::new(|| {
        RateLimiter::keyed(
            Quota::per_minute(NonZeroU32::new(60).unwrap())
                .allow_burst(NonZeroU32::new(10).unwrap()),
        )
    });
static TELEMETRY_QUEUE: OnceLock<mpsc::Sender<Bytes>> = OnceLock::new();

#[derive(Debug, Default, Deserialize)]
struct FaroPayload<'a> {
    #[serde(default)]
    meta: FaroMeta,
    #[serde(default)]
    exceptions: Vec<FaroException>,
    #[serde(borrow, default)]
    logs: Vec<FaroLog<'a>>,
    #[serde(default)]
    measurements: Vec<FaroMeasurement>,
}

#[derive(Debug, Default, Deserialize)]
struct FaroMeta {
    #[serde(default)]
    app: FaroApp,
    #[serde(default)]
    browser: FaroBrowser,
    #[serde(default)]
    page: FaroPage,
    #[serde(default)]
    user: FaroUser,
    #[serde(default)]
    session: FaroSession,
}

#[derive(Debug, Default, Deserialize)]
struct FaroPage {
    url: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FaroApp {
    name: Option<String>,
    version: Option<String>,
    environment: Option<String>,
    release: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FaroBrowser {
    name: Option<String>,
    version: Option<String>,
    os: Option<String>,
    mobile: Option<bool>,
}

#[derive(Debug, Default, Deserialize)]
struct FaroUser {
    id: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct FaroSession {
    id: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct FaroException {
    timestamp: Option<String>,
    #[serde(rename = "type")]
    exception_type: String,
    value: String,
    #[serde(default)]
    fatal: bool,
    fingerprint: Option<String>,
    #[serde(default)]
    context: HashMap<String, String>,
    stacktrace: Option<FaroStacktrace>,
}

#[derive(Debug, Deserialize)]
struct FaroStacktrace {
    #[serde(default)]
    frames: Vec<FaroStackFrame>,
}

#[derive(Debug, Deserialize)]
struct FaroStackFrame {
    filename: String,
    function: String,
    lineno: Option<u64>,
    colno: Option<u64>,
}

#[derive(Debug, Default, Deserialize)]
struct FaroLog<'a> {
    timestamp: Option<String>,
    level: String,
    message: String,
    #[serde(borrow, default)]
    context: Option<LazyValue<'a>>,
}

#[derive(Debug, Default, Deserialize)]
struct FaroMeasurement {
    #[serde(rename = "type")]
    measurement_type: String,
    #[serde(default)]
    values: HashMap<String, f64>,
    #[serde(default)]
    context: HashMap<String, String>,
}

impl FaroPayload<'_> {
    fn signal_count(&self) -> usize {
        self.exceptions
            .len()
            .saturating_add(self.logs.len())
            .saturating_add(self.measurements.len())
    }
}

fn truncated(value: &str, max_bytes: usize) -> &str {
    &value[..value.floor_char_boundary(max_bytes.min(value.len()))]
}

fn bounded_log_context(context: Option<&LazyValue<'_>>) -> HashMap<String, String> {
    let Some(context) = context else {
        return HashMap::new();
    };
    if context.get_type() != JsonType::Object {
        return HashMap::new();
    }
    let raw = context.as_raw_str();
    if raw.len() <= MAX_LOG_CONTEXT_BYTES {
        sonic_rs::from_str(raw).unwrap_or_default()
    } else {
        HashMap::from([(String::from("_omitted"), String::from("too_large"))])
    }
}

fn sanitized_page_path(raw_url: &str) -> String {
    let Ok(url) = url::Url::parse(raw_url) else {
        return String::new();
    };
    let Some(segments) = url.path_segments() else {
        return String::new();
    };
    let segments: Vec<_> = segments.collect();

    let mut path = String::new();
    for (index, segment) in segments.iter().enumerate() {
        path.push('/');
        let follows_invite = segments.get(index.wrapping_sub(1)) == Some(&"invite")
            || segments.get(index.wrapping_sub(2)) == Some(&"invite");
        let follows_reset_confirm = segments.get(index.wrapping_sub(1)) == Some(&"confirm")
            && segments.get(index.wrapping_sub(2)) == Some(&"reset");
        let follows_legacy_join_space = segments.get(index.wrapping_sub(1)) == Some(&"space")
            && segments.get(index.wrapping_sub(2)) == Some(&"join");
        let follows_legacy_join_space_id = segments.get(index.wrapping_sub(2)) == Some(&"space")
            && segments.get(index.wrapping_sub(3)) == Some(&"join");
        let follows_legacy_reset =
            segments.get(index.wrapping_sub(1)) == Some(&"confirm-password-reset");
        if uuid::Uuid::parse_str(segment).is_ok()
            || follows_invite
            || follows_reset_confirm
            || follows_legacy_join_space
            || follows_legacy_join_space_id
            || follows_legacy_reset
        {
            path.push_str(":id");
        } else {
            path.push_str(segment);
        }
    }
    path.truncate(path.floor_char_boundary(256));
    path
}

async fn telemetry_worker(mut receiver: mpsc::Receiver<Bytes>, resolver: SourceMapResolver) {
    while let Some(body) = receiver.recv().await {
        let payload: FaroPayload = match sonic_rs::from_slice(&body) {
            Ok(payload) => payload,
            Err(error) => {
                metrics::counter!(
                    "boluo_server_frontend_telemetry_requests_total",
                    "result" => "worker_parse_failed"
                )
                .increment(1);
                tracing::warn!(
                    event = "frontend.telemetry.worker_parse_failed",
                    %error,
                    "Failed to parse queued frontend telemetry payload"
                );
                continue;
            }
        };
        if let Err(error) = process(payload, &resolver).await {
            metrics::counter!(
                "boluo_server_frontend_telemetry_requests_total",
                "result" => "worker_process_failed"
            )
            .increment(1);
            tracing::warn!(
                event = "frontend.telemetry.worker_process_failed",
                %error,
                "Failed to process queued frontend telemetry payload"
            );
        }
    }
}

fn telemetry_queue(config: Config) -> &'static mpsc::Sender<Bytes> {
    TELEMETRY_QUEUE.get_or_init(|| {
        let (sender, receiver) = mpsc::channel(TELEMETRY_QUEUE_CAPACITY);
        std::thread::Builder::new()
            .name("frontend-telemetry".to_owned())
            .spawn(move || {
                let runtime = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .expect("frontend telemetry runtime can be created");
                runtime.block_on(async move {
                    let resolver = match SourceMapResolver::new(config.clone()).await {
                        Ok(resolver) => resolver,
                        Err(error) => {
                            tracing::error!(
                                event = "frontend.telemetry.sourcemap_start_failed",
                                %error,
                                "Failed to start frontend source map resolver; disabling symbolication"
                            );
                            SourceMapResolver::new(Config {
                                source_map_base_url: None,
                                ..config
                            })
                            .await
                            .expect("disabled source map resolver can be started")
                        }
                    };
                    telemetry_worker(receiver, resolver).await;
                });
            })
            .expect("frontend telemetry worker can be started");
        sender
    })
}

fn check_rate_limit(client_ip: IpAddr) -> Result<(), AppError> {
    let client_limited = match client_ip {
        IpAddr::V4(ip) => CLIENT_IPV4_LIMITER.check_key(&ip).is_err(),
        IpAddr::V6(_) => CLIENT_IPV6_PREFIX_LIMITER
            .check_key(
                &Ipv6Prefix64::from_ip(client_ip).expect("an IPv6 address always has a /64 prefix"),
            )
            .is_err(),
    };
    if client_limited {
        metrics::counter!(
            "boluo_server_frontend_telemetry_requests_total",
            "result" => "client_rate_limited"
        )
        .increment(1);
        return Err(AppError::LimitExceeded("Frontend telemetry client rate"));
    }
    // Check the global bucket last so a client already over its own quota cannot
    // consume capacity intended for other clients.
    if GLOBAL_LIMITER.check().is_err() {
        metrics::counter!(
            "boluo_server_frontend_telemetry_requests_total",
            "result" => "global_rate_limited"
        )
        .increment(1);
        return Err(AppError::LimitExceeded("Frontend telemetry global rate"));
    }
    Ok(())
}

fn exception_summary(exception: &FaroException) -> String {
    let exception_type = truncated(&exception.exception_type, 64).trim();
    let exception_value = truncated(&exception.value, MAX_EXCEPTION_SUMMARY_BYTES).trim();
    if exception_type.is_empty() {
        exception_value.to_owned()
    } else if exception_value.is_empty() {
        exception_type.to_owned()
    } else {
        format!("{exception_type}: {exception_value}")
    }
}

fn has_first_party_stack_frame(exception: &FaroException) -> bool {
    exception.stacktrace.as_ref().is_some_and(|stacktrace| {
        stacktrace.frames.iter().any(|frame| {
            let filename = frame.filename.as_str();
            filename.contains("/_next/static/") || filename.contains("/assets/")
        })
    })
}

fn validate_payload(payload: &FaroPayload<'_>) -> Result<(), AppError> {
    let signal_count = payload.signal_count();
    if signal_count == 0 {
        return Err(AppError::BadRequest(
            "Frontend telemetry batch is empty".to_owned(),
        ));
    }
    if signal_count > MAX_SIGNALS_PER_BATCH {
        return Err(AppError::BadRequest(
            "Frontend telemetry batch contains too many signals".to_owned(),
        ));
    }
    Ok(())
}

async fn process(payload: FaroPayload<'_>, resolver: &SourceMapResolver) -> Result<(), AppError> {
    validate_payload(&payload)?;

    let frontend_app_name = truncated(payload.meta.app.name.as_deref().unwrap_or("unknown"), 128);
    let frontend_app_version = truncated(payload.meta.app.version.as_deref().unwrap_or(""), 128);
    let frontend_app_environment =
        truncated(payload.meta.app.environment.as_deref().unwrap_or(""), 64);
    let frontend_app_release = truncated(payload.meta.app.release.as_deref().unwrap_or(""), 128);
    let browser_name = truncated(
        payload.meta.browser.name.as_deref().unwrap_or("unknown"),
        64,
    );
    let browser_version = truncated(payload.meta.browser.version.as_deref().unwrap_or(""), 64);
    let browser_os = truncated(payload.meta.browser.os.as_deref().unwrap_or(""), 64);
    let browser_mobile = payload.meta.browser.mobile.unwrap_or(false);
    // These identifiers are client-reported correlation hints, not authenticated identity.
    let frontend_user_id = truncated(payload.meta.user.id.as_deref().unwrap_or(""), 128);
    let faro_session_id = truncated(payload.meta.session.id.as_deref().unwrap_or(""), 128);
    let frontend_page_path = sanitized_page_path(payload.meta.page.url.as_deref().unwrap_or(""));

    for exception in &payload.exceptions {
        let symbolicated_stacktrace = resolver
            .stacktrace(
                frontend_app_name,
                exception.stacktrace.as_ref().map(|stacktrace| {
                    stacktrace
                        .frames
                        .iter()
                        .rev()
                        .take(32)
                        .map(|frame| StackFrame {
                            filename: truncated(&frame.filename, 512),
                            function: truncated(&frame.function, 256),
                            lineno: frame.lineno,
                            colno: frame.colno,
                        })
                }),
            )
            .await;
        let stacktrace = symbolicated_stacktrace.stacktrace;
        let raw_stacktrace = symbolicated_stacktrace.raw_stacktrace;
        let sourcemap_status = symbolicated_stacktrace.status;
        let exception_summary = exception_summary(exception);
        let frontend_exception_origin = if has_first_party_stack_frame(exception) {
            "first_party"
        } else {
            "external_or_unknown"
        };
        macro_rules! log_exception {
            ($level:ident) => {
                tracing::$level!(
                    event = "frontend.exception",
                    exception_type = truncated(&exception.exception_type, 256),
                    exception_value = truncated(&exception.value, MAX_MESSAGE_BYTES),
                    exception_fatal = exception.fatal,
                    exception_fingerprint =
                        truncated(exception.fingerprint.as_deref().unwrap_or(""), 256),
                    frontend_timestamp =
                        truncated(exception.timestamp.as_deref().unwrap_or(""), 64),
                    frontend_event_id = truncated(
                        exception
                            .context
                            .get("event_id")
                            .map(String::as_str)
                            .unwrap_or(""),
                        128
                    ),
                    frontend_error_digest = truncated(
                        exception
                            .context
                            .get("digest")
                            .map(String::as_str)
                            .unwrap_or(""),
                        128
                    ),
                    frontend_source = truncated(
                        exception
                            .context
                            .get("source")
                            .map(String::as_str)
                            .unwrap_or(""),
                        64
                    ),
                    frontend_request_path = truncated(
                        exception
                            .context
                            .get("request_path")
                            .map(String::as_str)
                            .unwrap_or(""),
                        256
                    ),
                    api_error_code = truncated(
                        exception
                            .context
                            .get("api_error_code")
                            .map(String::as_str)
                            .unwrap_or(""),
                        64
                    ),
                    component_stack = truncated(
                        exception
                            .context
                            .get("component_stack")
                            .map(String::as_str)
                            .unwrap_or(""),
                        MAX_STACKTRACE_BYTES
                    ),
                    stacktrace,
                    raw_stacktrace,
                    sourcemap_status,
                    frontend_exception_origin,
                    frontend_app_name,
                    frontend_app_version,
                    frontend_app_environment,
                    frontend_app_release,
                    browser_name,
                    browser_version,
                    browser_os,
                    browser_mobile,
                    frontend_user_id,
                    faro_session_id,
                    frontend_page_path,
                    "{}",
                    exception_summary
                );
            };
        }
        if frontend_exception_origin == "external_or_unknown" {
            log_exception!(info);
        } else {
            log_exception!(error);
        }
    }

    for log in &payload.logs {
        let message = truncated(&log.message, MAX_MESSAGE_BYTES);
        let frontend_log_context = bounded_log_context(log.context.as_ref());
        match log.level.as_str() {
            "error" => {
                tracing::error!(
                    event = "frontend.log",
                    frontend_level = "error",
                    frontend_timestamp = truncated(log.timestamp.as_deref().unwrap_or(""), 64),
                    frontend_app_name,
                    frontend_app_version,
                    frontend_app_environment,
                    frontend_app_release,
                    browser_name,
                    browser_version,
                    browser_os,
                    browser_mobile,
                    frontend_user_id,
                    faro_session_id,
                    frontend_page_path,
                    frontend_log_context = tracing::field::valuable(&frontend_log_context),
                    "{}",
                    message
                );
            }
            "warn" => {
                tracing::warn!(
                    event = "frontend.log",
                    frontend_level = "warn",
                    frontend_timestamp = truncated(log.timestamp.as_deref().unwrap_or(""), 64),
                    frontend_app_name,
                    frontend_app_version,
                    frontend_app_environment,
                    frontend_app_release,
                    browser_name,
                    browser_version,
                    browser_os,
                    browser_mobile,
                    frontend_user_id,
                    faro_session_id,
                    frontend_page_path,
                    frontend_log_context = tracing::field::valuable(&frontend_log_context),
                    "{}",
                    message
                );
            }
            _ => {}
        }
    }

    for measurement in &payload.measurements {
        if measurement.measurement_type == "web-vitals" {
            let rating = measurement
                .context
                .get("rating")
                .map(String::as_str)
                .filter(|rating| matches!(*rating, "good" | "needs-improvement" | "poor"));
            for metric in ["fcp", "inp", "lcp", "ttfb"] {
                if let Some(value) = measurement.values.get(metric).copied()
                    && value.is_finite()
                    && value >= 0.0
                {
                    metrics::histogram!(
                        "boluo_server_frontend_web_vital_duration_seconds",
                        "metric" => metric
                    )
                    .record(value / 1_000.0);
                    if let Some(rating) = rating {
                        metrics::counter!(
                            "boluo_server_frontend_web_vital_ratings_total",
                            "metric" => metric,
                            "rating" => rating.to_owned()
                        )
                        .increment(1);
                    }
                }
            }
            if let Some(value) = measurement.values.get("cls").copied()
                && value.is_finite()
                && value >= 0.0
            {
                metrics::histogram!("boluo_server_frontend_web_vital_cls").record(value);
                if let Some(rating) = rating {
                    metrics::counter!(
                        "boluo_server_frontend_web_vital_ratings_total",
                        "metric" => "cls",
                        "rating" => rating.to_owned()
                    )
                    .increment(1);
                }
            }
        }
    }
    Ok(())
}

pub async fn ingest<B>(req: Request<B>) -> Result<Response, AppError>
where
    B: Body,
    B::Error: Into<Box<dyn std::error::Error + Send + Sync>>,
{
    if req.method() != Method::POST {
        return Err(AppError::MethodNotAllowed);
    }
    let headers = req.headers();
    let is_json = headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.split(';').next() == Some("application/json"));
    if !is_json {
        return Err(AppError::BadRequest(
            "Frontend telemetry must use application/json".to_owned(),
        ));
    }
    if headers
        .get(CONTENT_ENCODING)
        .is_some_and(|value| value != "identity")
    {
        return Err(AppError::BadRequest(
            "Compressed frontend telemetry is not supported".to_owned(),
        ));
    }
    let client_ip = crate::client_ip::ClientIp::require(&req)?;
    check_rate_limit(client_ip)?;

    let body = read_body_limited(req, MAX_BODY_BYTES).await?;
    let payload: FaroPayload = sonic_rs::from_slice(&body)
        .map_err(|_| AppError::BadRequest("Invalid frontend telemetry payload".to_owned()))?;
    validate_payload(&payload)?;
    drop(payload);

    match telemetry_queue(Config::default()).try_send(body) {
        Ok(()) => {
            metrics::counter!(
                "boluo_server_frontend_telemetry_requests_total",
                "result" => "accepted"
            )
            .increment(1);
        }
        Err(mpsc::error::TrySendError::Full(_)) => {
            metrics::counter!(
                "boluo_server_frontend_telemetry_requests_total",
                "result" => "queue_full"
            )
            .increment(1);
            tracing::warn!(
                event = "frontend.telemetry.queue_full",
                "Dropping frontend telemetry because the queue is full"
            );
        }
        Err(mpsc::error::TrySendError::Closed(_)) => {
            metrics::counter!(
                "boluo_server_frontend_telemetry_requests_total",
                "result" => "queue_closed"
            )
            .increment(1);
            tracing::error!(
                event = "frontend.telemetry.queue_closed",
                "Dropping frontend telemetry because the queue is closed"
            );
        }
    }

    hyper::Response::builder()
        .status(StatusCode::ACCEPTED)
        .body(crate::interface::ResponseBytes::new())
        .map_err(|error| AppError::Unexpected(error.into()))
}

pub fn start_worker(config: Config) {
    let _ = telemetry_queue(config);
}

pub fn start_rate_limiter_cleanup() {
    crate::rate_limit::start_cleanup_task(
        || {
            CLIENT_IPV4_LIMITER.retain_recent();
            CLIENT_IPV6_PREFIX_LIMITER.retain_recent();
        },
        || {
            CLIENT_IPV4_LIMITER.shrink_to_fit();
            CLIENT_IPV6_PREFIX_LIMITER.shrink_to_fit();
        },
    );
}

#[cfg(test)]
mod tests {
    use http_body_util::Full;
    use hyper::body::Bytes;

    use super::*;

    #[test]
    fn sanitizes_frontend_page_url() {
        assert_eq!(
            sanitized_page_path(
                "https://example.com/en/light/space/invite/not-a-uuid/secret-token?secret=value#fragment"
            ),
            "/en/light/space/invite/:id/:id"
        );
        assert_eq!(
            sanitized_page_path("https://example.com/en/light/account/reset/confirm/secret-token"),
            "/en/light/account/reset/confirm/:id"
        );
        assert_eq!(
            sanitized_page_path("https://old.example.com/join/space/compact-id/compact-token"),
            "/join/space/:id/:id"
        );
        assert_eq!(
            sanitized_page_path("https://old.example.com/confirm-password-reset/opaque-token"),
            "/confirm-password-reset/:id"
        );
        assert_eq!(sanitized_page_path("not a URL"), "");
    }

    fn request(body: impl Into<Bytes>) -> Request<Full<Bytes>> {
        let mut request = Request::builder()
            .method(Method::POST)
            .header(CONTENT_TYPE, "application/json")
            .body(Full::new(body.into()))
            .unwrap();
        crate::client_ip::Resolver::new(Vec::new(), &[], crate::client_ip::Ingress::bare_metal())
            .attach("192.0.2.1".parse().unwrap(), &mut request);
        request
    }

    #[tokio::test]
    async fn accepts_faro_logs_exceptions_and_web_vitals() {
        let mut request = request(
            r#"{
                "meta":{"app":{"name":"spa","version":"1"},"browser":{"name":"Firefox"}},
                "exceptions":[{
                    "timestamp":"2026-08-24T00:00:00.000Z",
                    "type":"TypeError",
                    "value":"broken",
                    "fatal":false,
                    "context":{"event_id":"0198-test","component_stack":"at Chat"}
                }],
                "logs":[{
                    "timestamp":"2026-08-24T00:00:00.000Z",
                    "level":"warn",
                    "message":"Messages are not sorted by pos",
                    "context":{
                        "spaceId":"space-1",
                        "channelId":"channel-1",
                        "updateId":"10:1:2",
                        "previousCursor":"9:1:1",
                        "actionType":"messageEdited"
                    }
                }],
                "measurements":[{
                    "timestamp":"2026-08-24T00:00:00.000Z",
                    "type":"web-vitals",
                    "values":{"lcp":123.4,"delta":12.3},
                    "context":{"rating":"good"}
                }]
            }"#,
        );
        request.headers_mut().insert(
            CONTENT_TYPE,
            "application/json; charset=UTF-8".parse().unwrap(),
        );
        let response = ingest(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::ACCEPTED);
    }

    #[tokio::test]
    async fn rejects_empty_and_oversized_batches() {
        let empty = ingest(request(r#"{"meta":{}}"#)).await.unwrap_err();
        assert!(matches!(empty, AppError::BadRequest(_)));

        let logs = (0..=MAX_SIGNALS_PER_BATCH)
            .map(|_| r#"{"level":"warn","message":"x"}"#)
            .collect::<Vec<_>>()
            .join(",");
        let body = format!(r#"{{"logs":[{logs}]}}"#);
        let too_many = ingest(request(body)).await.unwrap_err();
        assert!(matches!(too_many, AppError::BadRequest(_)));
    }

    #[tokio::test]
    async fn rejects_compressed_and_oversized_payloads() {
        let mut compressed = request(r#"{"logs":[{"level":"warn","message":"x"}]}"#);
        compressed
            .headers_mut()
            .insert(CONTENT_ENCODING, "gzip".parse().unwrap());
        let compressed = ingest(compressed).await.unwrap_err();
        assert!(matches!(compressed, AppError::BadRequest(_)));

        let oversized = ingest(request(" ".repeat(MAX_BODY_BYTES + 1)))
            .await
            .unwrap_err();
        assert!(matches!(oversized, AppError::PayloadTooLarge));
    }

    #[test]
    fn truncates_at_a_utf8_boundary() {
        assert_eq!(truncated("a界b", 3), "a");
        assert_eq!(truncated("a界b", 4), "a界");
    }
}
