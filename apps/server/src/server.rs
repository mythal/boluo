#![allow(dead_code)]
// Hyper's nested routing futures require deeper recursion when proving `Send`.
#![recursion_limit = "256"]
#![allow(
    clippy::too_many_arguments,
    clippy::needless_return,
    clippy::collapsible_if
)]

use std::env;
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::sync::LazyLock;

use clap::{Args as ClapArgs, Parser, Subcommand};
use futures::pin_mut;
use http_body_util::Full;
use hyper::body::Incoming;
use hyper::header::ORIGIN;
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::server::conn::auto::Builder as AutoBuilder;
use metrics::{counter, gauge};
use tokio::net::TcpListener;
use tokio::sync::watch;

use hyper::Request;
use hyper::service::service_fn;
use rusty_s3::S3Action;

#[macro_use]
mod utils;
#[macro_use]
mod error;
mod assets;
mod cache;
mod channels;
mod characters;
mod client_ip;
mod committed_changes;
mod config;
mod context;
mod cors;
mod csrf;
mod db;
mod disk_cache;
mod entries;
mod events;
mod frontend_telemetry;
mod http_client;
mod info;
mod interface;
mod mail;
mod maintenance;
mod media;
mod messages;
mod notes;
mod notify;
mod platform;
mod pos;
mod pubsub;
mod rate_limit;
mod redis;
mod rs;
mod s3;
mod scopes;
mod server_metrics;
mod session;
mod shutdown;
mod space_payload_cache;
mod space_runtime;
mod spaces;
mod ts;
mod ttl;
mod typegen;
mod users;
mod validators;
mod websocket;

use crate::cors::allow_origin;
use crate::db::MIGRATOR;
use crate::error::AppError;
use crate::interface::{err_response, missing, ok_response};

const REQUEST_ID_HEADER: hyper::header::HeaderName =
    hyper::header::HeaderName::from_static("x-request-id");
const FARO_SESSION_ID_HEADER: hyper::header::HeaderName =
    hyper::header::HeaderName::from_static("x-faro-session-id");
const MAX_FARO_SESSION_ID_LENGTH: usize = 128;

fn faro_session_id(headers: &hyper::HeaderMap) -> Option<&str> {
    headers
        .get(&FARO_SESSION_ID_HEADER)
        .and_then(|value| value.to_str().ok())
        .filter(|value| {
            !value.is_empty()
                && value.len() <= MAX_FARO_SESSION_ID_LENGTH
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || b"._:-".contains(&byte))
        })
}

static APP_VERSION: LazyLock<String> = LazyLock::new(|| {
    std::env::var("APP_VERSION").unwrap_or_else(|_| env!("CARGO_PKG_VERSION").to_owned())
});

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

async fn router(
    ctx: &context::AppContext,
    req: Request<Incoming>,
) -> Result<interface::Response, AppError> {
    let path = req.uri().path().to_string();

    if !path.starts_with("/api/") {
        let target = "https://old.boluochat.com".to_string() + &path;
        return hyper::Response::builder()
            .status(302)
            .header("Location", target)
            .body(Vec::new())
            .map_err(|err| AppError::Unexpected(err.into()));
    }

    macro_rules! table {
        ($prefix: expr, $handler: expr) => {
            let prefix = $prefix;
            if let Some(stripped) = path.strip_prefix(prefix) {
                return $handler(ctx, req, stripped).await;
            }
        };
    }
    if path == "/api/csrf-token" {
        return csrf::get_csrf_token(ctx, req).await.map(ok_response);
    }
    if path == "/api/telemetry" {
        return frontend_telemetry::ingest(req).await;
    }
    table!("/api/maintenance", maintenance::router);
    table!("/api/info", info::router);
    table!("/api/assets", assets::router);
    table!("/api/messages", messages::router);
    table!("/api/users", users::router);
    table!("/api/media", media::router);
    table!("/api/channels", channels::router);
    table!("/api/characters", characters::router);
    table!("/api/spaces", spaces::router);
    table!("/api/notes", notes::router);
    table!("/api/entries", entries::router);
    table!("/api/events", events::router);
    table!("/api/updates", events::router);
    missing()
}

async fn handler(
    ctx: &context::AppContext,
    req: Request<Incoming>,
) -> Result<hyper::Response<Full<hyper::body::Bytes>>, hyper::Error> {
    use tracing::Instrument as _;

    let method = req.method().clone();
    let path = req.uri().path().to_owned();
    let request_id = request_id(req.headers(), ctx.config.platform.request_id_header());

    let client_version = req
        .headers()
        .get(hyper::header::HeaderName::from_static("x-client-version"))
        .and_then(|x| x.to_str().ok())
        .unwrap_or("");
    let faro_session_id = faro_session_id(req.headers());

    let span = tracing::info_span!(
        "http_request",
        request_id = %request_id.to_str().unwrap_or("invalid"),
        method = %method,
        path = %path,
        status_code = tracing::field::Empty,
        duration_ms = tracing::field::Empty,
        request_content_length = tracing::field::Empty,
        request_body_read_ms = tracing::field::Empty,
        request_body_bytes = tracing::field::Empty,
        user_id = tracing::field::Empty,
        error = tracing::field::Empty,
        auth_method = tracing::field::Empty,
        faro_session_id = tracing::field::Empty,
        client = %client_version,
        app_version = %APP_VERSION.as_str(),
        startup_id = events::startup_id(),
    );
    if let Some(faro_session_id) = faro_session_id {
        span.record("faro_session_id", faro_session_id);
    }
    if let Some(content_length) = req
        .headers()
        .get(hyper::header::CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
    {
        span.record("request_content_length", content_length);
    }

    let start = std::time::Instant::now();

    // Extract origin for CORS
    let origin = req
        .headers()
        .get(ORIGIN)
        .and_then(|x| x.to_str().ok())
        .map(|x| x.to_owned());

    // Handle preflight requests quickly
    if req.method() == hyper::Method::OPTIONS {
        let mut response = cors::preflight_requests(req);
        response.headers_mut().insert(REQUEST_ID_HEADER, request_id);
        span.record("status_code", 200);
        span.record("duration_ms", start.elapsed().as_millis() as u64);
        return Ok(response);
    }

    // Route the request
    async {
        let response = router(ctx, req).await;
        let duration = start.elapsed();
        let span = tracing::Span::current();

        let response = allow_origin(
            origin.as_deref(),
            match response {
                Ok(response) => {
                    span.record("status_code", response.status().as_u16());
                    span.record("duration_ms", duration.as_millis() as u64);

                    if response.status().is_server_error() {
                        tracing::error!(event = "http.request.server_error", "Request failed");
                    } else if duration.as_millis() > 500 {
                        tracing::warn!(event = "http.request.slow", "Slow request");
                    } else {
                        tracing::debug!(event = "http.request.completed", "Request completed");
                    }
                    response.map(|bytes| Full::new(bytes.into()))
                }
                Err(e) => {
                    let status_code = e.status_code().as_u16();
                    span.record("status_code", status_code);
                    span.record("duration_ms", duration.as_millis() as u64);
                    span.record("error", format!("{e}").as_str());

                    error::log_error(&e, &path);

                    err_response(e).map(|bytes| Full::new(bytes.into()))
                }
            },
        );

        let mut response = response;
        response.headers_mut().insert(REQUEST_ID_HEADER, request_id);
        Ok(response)
    }
    .instrument(span)
    .await
}

fn request_id(
    headers: &hyper::HeaderMap,
    platform_header: Option<&hyper::header::HeaderName>,
) -> hyper::header::HeaderValue {
    headers
        .get(&REQUEST_ID_HEADER)
        .or_else(|| platform_header.and_then(|header| headers.get(header)))
        .filter(|value| {
            !value.is_empty()
                && value.as_bytes().len() <= 128
                && value
                    .as_bytes()
                    .iter()
                    .all(|byte| byte.is_ascii_alphanumeric() || b"._:-".contains(byte))
        })
        .cloned()
        .unwrap_or_else(|| {
            hyper::header::HeaderValue::from_str(&uuid::Uuid::now_v7().to_string())
                .expect("UUID is a valid header value")
        })
}

#[cfg(test)]
mod request_id_tests {
    use super::*;

    #[test]
    fn preserves_valid_request_id() {
        let mut headers = hyper::HeaderMap::new();
        headers.insert(&REQUEST_ID_HEADER, "request-123".parse().unwrap());

        assert_eq!(request_id(&headers, None), "request-123");
    }

    #[test]
    fn falls_back_to_fly_request_id() {
        let mut headers = hyper::HeaderMap::new();
        let fly_request_id = hyper::header::HeaderName::from_static("fly-request-id");
        headers.insert(&fly_request_id, "fly:request-123".parse().unwrap());

        assert_eq!(
            request_id(&headers, Some(&fly_request_id)),
            "fly:request-123"
        );
    }

    #[test]
    fn bare_metal_ignores_fly_request_id() {
        let mut headers = hyper::HeaderMap::new();
        headers.insert(
            hyper::header::HeaderName::from_static("fly-request-id"),
            "fly:request-123".parse().unwrap(),
        );

        let generated = request_id(&headers, None);
        assert_ne!(generated, "fly:request-123");
        assert!(uuid::Uuid::parse_str(generated.to_str().unwrap()).is_ok());
    }

    #[test]
    fn replaces_unsafe_request_id() {
        let mut headers = hyper::HeaderMap::new();
        headers.insert(&REQUEST_ID_HEADER, "contains spaces".parse().unwrap());

        let generated = request_id(&headers, None);
        let generated = generated.to_str().unwrap();
        assert_ne!(generated, "contains spaces");
        assert!(uuid::Uuid::parse_str(generated).is_ok());
    }
}

#[cfg(test)]
mod faro_session_id_tests {
    use super::*;

    #[test]
    fn accepts_safe_session_id() {
        let mut headers = hyper::HeaderMap::new();
        headers.insert(&FARO_SESSION_ID_HEADER, "session-123".parse().unwrap());

        assert_eq!(faro_session_id(&headers), Some("session-123"));
    }

    #[test]
    fn rejects_unsafe_or_oversized_session_id() {
        let mut headers = hyper::HeaderMap::new();
        headers.insert(&FARO_SESSION_ID_HEADER, "contains spaces".parse().unwrap());
        assert_eq!(faro_session_id(&headers), None);

        let oversized = "a".repeat(MAX_FARO_SESSION_ID_LENGTH + 1);
        headers.insert(&FARO_SESSION_ID_HEADER, oversized.parse().unwrap());
        assert_eq!(faro_session_id(&headers), None);
    }
}

#[tracing::instrument(skip(storage))]
async fn storage_check(storage: &s3::Storage, ci: bool) {
    // Skip in CI
    if ci {
        return;
    }
    let mut action = storage
        .bucket()
        .put_object(Some(storage.credentials()), "check");
    action
        .headers_mut()
        .insert("content-type", "application/octet-stream");
    let url = action.sign(std::time::Duration::from_secs(60));
    storage
        .client()
        .put(url.as_str())
        .header("content-type", "application/octet-stream")
        .body(Vec::<u8>::new())
        .send()
        .await
        .expect("Cannot connect to bucket");
    tracing::info!("Object Storage is ready");
}
#[derive(Parser)]
struct Cli {
    #[clap(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Run the HTTP server
    Serve(Box<ServeArgs>),
    /// Initialize the database
    Init(InitArgs),
    /// Export TypeScript types
    Types,
}

#[derive(ClapArgs)]
struct InitArgs {
    /// Database URL
    #[clap(long, env = "DATABASE_URL")]
    database_url: String,

    /// Whether to load fixtures
    #[clap(long, default_value_t = false)]
    fixtures: bool,
}

#[derive(ClapArgs)]
struct ServeArgs {
    #[clap(long, env = "HOST", default_value = "127.0.0.1")]
    host: IpAddr,
    #[clap(long, env = "PORT", default_value_t = 3000)]
    port: u16,
    #[clap(long, env = "PROMETHEUS_EXPORTER")]
    prometheus_exporter: Option<SocketAddr>,
    /// Hosting platform, which defines the trusted HTTP ingress boundary.
    #[clap(long, env = "PLATFORM", value_enum)]
    platform: Option<platform::Platform>,
    /// CDN providers whose published networks may supply X-Forwarded-For.
    #[clap(
        long = "trusted-cdn",
        env = "TRUSTED_CDNS",
        value_enum,
        value_delimiter = ','
    )]
    trusted_cdns: Vec<client_ip::CdnProvider>,
    /// Additional proxy IP addresses or CIDRs that may supply X-Forwarded-For.
    #[clap(
        long,
        env = "TRUSTED_PROXIES",
        value_delimiter = ',',
        value_parser = client_ip::parse_trusted_proxy,
        alias = "trusted-proxy-cidrs"
    )]
    trusted_proxy: Vec<ipnet::IpNet>,
    #[clap(long, env = "DATABASE_URL")]
    database_url: String,
    #[clap(long, env = "REDIS_URL")]
    redis_url: Option<String>,
    #[clap(long, env = "CI", default_value_t = false)]
    ci: bool,
    #[clap(long, env = "BOLUO_DEBUG", default_value_t = false)]
    debug: bool,
    #[clap(long, env = "PUBLIC_MEDIA_URL")]
    public_media_url: Option<String>,
    #[clap(long, env = "APP_URL")]
    app_url: Option<String>,
    #[clap(long, env = "SITE_URL")]
    site_url: Option<String>,
    #[clap(long, env = "DISCOURSE_SSO_SECRET")]
    discourse_sso_secret: Option<String>,
    #[clap(long, env = "SECRET")]
    secret: String,
    #[clap(long, env = "MAILGUN_DOMAIN", requires = "mailgun_api_key")]
    mailgun_domain: Option<String>,
    #[clap(long, env = "MAILGUN_API_KEY", requires = "mailgun_domain")]
    mailgun_api_key: Option<String>,
    #[clap(long, env = "S3_ENDPOINT_URL")]
    s3_endpoint_url: Option<String>,
    #[clap(long, env = "S3_BUCKET_NAME")]
    s3_bucket_name: Option<String>,
    #[clap(long, env = "S3_ACCESS_KEY_ID")]
    s3_access_key_id: Option<String>,
    #[clap(long, env = "S3_SECRET_ACCESS_KEY")]
    s3_secret_access_key: Option<String>,
    #[clap(long, help = "check only", default_value = "false")]
    check: bool,
    #[clap(long, env = "DISK_CACHE_PATH", help = "redb disk cache path")]
    disk_cache_path: Option<PathBuf>,
    #[clap(
        long,
        env = "DISK_CACHE_DISABLED",
        default_value_t = false,
        help = "disable the redb disk cache"
    )]
    disable_disk_cache: bool,
    #[clap(
        long,
        env = "DISK_CACHE_MEMORY_MB",
        default_value_t = 16,
        help = "redb disk cache memory in MiB"
    )]
    disk_cache_memory_mb: usize,
    #[clap(
        long,
        env = "DISK_CACHE_MAX_FILE_MB",
        default_value_t = 4096,
        help = "redb disk cache maximum file size in MiB"
    )]
    disk_cache_max_file_mb: u64,
    #[clap(
        long,
        env = "SPACE_PAYLOAD_CACHE_MB",
        default_value_t = space_payload_cache::DEFAULT_MEMORY_CACHE_BYTES / (1024 * 1024),
        help = "Space payload memory cache size in MiB"
    )]
    space_payload_cache_mb: usize,
    #[clap(
        long,
        env = "SPACE_PAYLOAD_DISK_CACHE_PATH",
        help = "Space payload foyer disk cache directory"
    )]
    space_payload_disk_cache_path: Option<PathBuf>,
    #[clap(
        long,
        env = "SPACE_PAYLOAD_DISK_CACHE_MB",
        default_value_t = space_payload_cache::DEFAULT_DISK_CACHE_BYTES / (1024 * 1024),
        help = "Space payload foyer disk cache size in MiB; set to 0 to disable"
    )]
    space_payload_disk_cache_mb: usize,
}

fn disk_cache_config(args: &ServeArgs) -> Option<disk_cache::Config> {
    if args.disable_disk_cache {
        return None;
    }
    let path = args
        .disk_cache_path
        .clone()
        .unwrap_or_else(|| env::temp_dir().join("boluo-cache.redb"));
    if path.as_os_str().is_empty() {
        return None;
    }

    Some(disk_cache::Config {
        path,
        cache_size: args.disk_cache_memory_mb.saturating_mul(1024 * 1024),
        max_file_size: args.disk_cache_max_file_mb.saturating_mul(1024 * 1024),
    })
}

async fn space_payload_cache(args: &ServeArgs) -> space_payload_cache::SpacePayloadCache {
    let memory_capacity = args.space_payload_cache_mb.saturating_mul(1024 * 1024);
    let disk_path = args
        .space_payload_disk_cache_path
        .clone()
        .unwrap_or_else(|| env::temp_dir().join("boluo-space-payloads"));
    if args.space_payload_disk_cache_mb == 0 || disk_path.as_os_str().is_empty() {
        tracing::info!(memory_capacity, "Space payload disk cache is disabled");
        return space_payload_cache::SpacePayloadCache::memory_only(memory_capacity);
    }

    let config = space_payload_cache::HybridCacheConfig {
        memory_capacity,
        disk_capacity: args.space_payload_disk_cache_mb.saturating_mul(1024 * 1024),
        disk_path,
    };
    match space_payload_cache::SpacePayloadCache::hybrid(config).await {
        Ok(cache) => cache,
        Err(error) => {
            tracing::error!(
                event = "space_payload_cache.start_failed",
                %error,
                memory_capacity,
                "Failed to start the Space payload disk cache; using memory only"
            );
            space_payload_cache::SpacePayloadCache::memory_only(memory_capacity)
        }
    }
}

async fn init_database(args: InitArgs) {
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .connect(&args.database_url)
        .await
        .expect("Cannot connect to database");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    if args.fixtures {
        let mut paths: Vec<std::fs::DirEntry> = std::fs::read_dir("./apps/server/fixtures")
            .expect("Cannot read fixtures directory")
            .map(|res| res.expect("Cannot read fixture file"))
            .collect();
        paths.sort_by_key(|entry| entry.file_name());
        for path in paths {
            let sql = std::fs::read_to_string(path.path()).expect("Cannot read fixture file");
            sqlx::raw_sql(sqlx::AssertSqlSafe(sql))
                .execute(&pool)
                .await
                .expect("Failed to execute fixture SQL");
        }
    }
}

fn start_log_drop_metrics(error_counter: tracing_appender::non_blocking::ErrorCounter) {
    metrics::describe_counter!(
        "boluo_server_log_output_dropped_total",
        "Structured log lines dropped because the non-blocking stdout queue was full"
    );
    tokio::spawn(async move {
        let metric = metrics::counter!("boluo_server_log_output_dropped_total");
        let mut reported = 0;
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
        loop {
            interval.tick().await;
            let dropped = error_counter.dropped_lines();
            let delta = dropped.saturating_sub(reported);
            if delta > 0 {
                metric.increment(delta as u64);
                reported = dropped;
            }
        }
    });
}

#[tokio::main(worker_threads = 5)]
async fn main() {
    use tracing_subscriber::filter::{EnvFilter, LevelFilter};

    let wants_help = std::env::args()
        .skip(1)
        .any(|arg| matches!(arg.as_str(), "--help" | "-h" | "--version" | "-V"));
    if !wants_help {
        config::load();
    }
    let command = Cli::parse().command;
    let args = match command {
        Command::Serve(args) => args,
        Command::Init(args) => {
            init_database(args).await;
            return;
        }
        Command::Types => {
            typegen::prepare();
            typegen::run();
            return;
        }
    };

    let filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy();
    let (log_writer, log_guard) = tracing_appender::non_blocking::NonBlockingBuilder::default()
        .buffered_lines_limit(2_048)
        .lossy(true)
        .thread_name("boluo-log-writer")
        .finish(std::io::stdout());
    let log_error_counter = log_writer.error_counter();
    tracing_subscriber::fmt()
        .json()
        .flatten_event(true)
        .with_current_span(true)
        .with_span_list(false)
        .with_writer(log_writer)
        .with_env_filter(filter)
        .init();
    // Keep the guard alive until after the final log event so shutdown flushes
    // the queue before terminating the writer thread.
    let _log_guard = log_guard;

    let storage = std::sync::Arc::new(s3::Storage::new(s3::StorageConfig {
        endpoint_url: args.s3_endpoint_url.clone(),
        bucket_name: args.s3_bucket_name.clone(),
        access_key_id: args.s3_access_key_id.clone(),
        secret_access_key: args.s3_secret_access_key.clone(),
    }));

    storage_check(&storage, args.ci).await;

    let socket = SocketAddr::new(args.host, args.port);
    let platform = platform::Runtime::detect(args.platform);
    tracing::info!(platform = ?platform.platform(), "Hosting platform selected");
    pubsub::initialize_node_id(platform.node_id());
    let client_ip_resolver = client_ip::Resolver::new(
        args.trusted_proxy.clone(),
        &args.trusted_cdns,
        platform.ingress(),
    );

    let listener = TcpListener::bind(socket)
        .await
        .expect("Failed to bind address");

    tracing::info!("Server listening on: {}", socket);

    db::check_db_host(&args.database_url).await;

    let pool = {
        // Database Migrations
        let pool = db::connect(&args.database_url).await;
        MIGRATOR
            .run(&pool)
            .await
            .expect("Failed to run database migrations");
        pool
    };
    db::check(&pool).await;
    tracing::info!("Database is ready");
    let mut redis_conn = redis::connect(args.redis_url.as_deref()).await;
    redis::check(redis_conn.as_mut()).await;
    let startup_id = events::initialize_startup_id(redis_conn.as_mut(), &platform).await;
    tracing::info!("Redis is ready");

    let ctx_config = context::AppConfig {
        ci: args.ci,
        debug: args.debug,
        public_media_url: args.public_media_url.clone(),
        app_url: args.app_url.clone(),
        site_url: args.site_url.clone(),
        discourse_sso_secret: args.discourse_sso_secret.clone(),
        secret: args.secret.clone(),
        platform,
        mail: mail::Config {
            domain: args.mailgun_domain.clone(),
            api_key: args.mailgun_api_key.clone(),
        },
    };
    let space_payload_cache = space_payload_cache(&args).await;
    let ctx = std::sync::Arc::new(context::AppContext::with_config_and_space_payload_cache(
        pool.clone(),
        redis_conn,
        ctx_config,
        storage,
        space_payload_cache,
    ));

    if ctx.config.site_url.is_none() {
        tracing::error!(
            event = "server.configuration.site_url_missing",
            "SITE_URL is not set"
        );
    }
    if ctx.config.app_url.is_none() {
        tracing::error!(
            event = "server.configuration.app_url_missing",
            "APP_URL is not set"
        );
    }
    if ctx.config.public_media_url.is_none() {
        tracing::error!(
            event = "server.configuration.public_media_url_missing",
            "PUBLIC_MEDIA_URL is not set"
        );
    }

    server_metrics::init_metrics(&pool).await;

    if args.check {
        return;
    }

    tracing::info!("AppContext initialized");

    if let Some(addr) = args.prometheus_exporter {
        metrics_exporter_prometheus::PrometheusBuilder::new()
            .set_buckets_for_metric(
                metrics_exporter_prometheus::Matcher::Full(
                    "boluo_server_frontend_web_vital_duration_seconds".to_owned(),
                ),
                &[
                    0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1.0, 1.5, 1.8, 2.5, 4.0, 6.0, 10.0, 20.0,
                ],
            )
            .expect("frontend Web Vital duration buckets are valid")
            .set_buckets_for_metric(
                metrics_exporter_prometheus::Matcher::Full(
                    "boluo_server_frontend_web_vital_cls".to_owned(),
                ),
                &[0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.5, 1.0, 2.0],
            )
            .expect("frontend CLS buckets are valid")
            .with_http_listener(addr)
            .install()
            .expect("Failed to install Prometheus metrics exporter");
        tracing::info!("Prometheus metrics exporter installed on {}", addr);

        tokio::task::spawn(
            tokio_metrics::RuntimeMetricsReporterBuilder::default()
                .with_interval(std::time::Duration::from_secs(15))
                .describe_and_run(),
        );
    }
    start_log_drop_metrics(log_error_counter);
    maintenance::start_token_rotation();
    client_ip_resolver.start_proxy_probe_refresh(pool.clone(), ctx.signer().clone());
    client_ip_resolver.start_cdn_refresh();
    disk_cache::init(disk_cache_config(&args));
    // https://tokio.rs/tokio/topics/shutdown
    let mut terminate_stream =
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to create signal stream");

    server_metrics::start_update_metrics(pool.clone(), ctx.redis.clone(), ctx.space_store.clone());
    tracing::info!(
        event = "server.started",
        startup_id,
        app_version = %APP_VERSION.as_str(),
        "Server started"
    );

    cache::start_expiry_task();
    cache::start_log_cache_stats();
    users::start_rate_limiter_cleanup();
    messages::start_rate_limiter_cleanup();
    spaces::start_rate_limiter_cleanup();
    channels::start_rate_limiter_cleanup();
    media::start_rate_limiter_cleanup();
    frontend_telemetry::start_rate_limiter_cleanup();
    let timeout_counter = metrics::counter!("boluo_server_tcp_connections_timeout_total");
    let error_counter = metrics::counter!("boluo_server_tcp_connections_error_total");

    loop {
        tokio::select! {
            accept_result = listener.accept() => {
                handle_connection(
                    ctx.clone(),
                    &client_ip_resolver,
                    accept_result,
                    timeout_counter.clone(),
                    error_counter.clone(),
                ).await;
            },
            _ = terminate_stream.recv() => {
                tracing::info!("Graceful shutdown signal received");
                break;
            },
        }
    }
    shutdown::SHUTDOWN.notify_waiters();
    tokio::time::sleep(std::time::Duration::from_secs(4)).await;
    if let Err(error) = ctx.space_store.close_space_payload_cache().await {
        tracing::warn!(
            event = "space_payload_cache.shutdown_failed",
            %error,
            "Failed to close the Space payload cache cleanly"
        );
    }
    disk_cache::shutdown().await;
    tracing::info!("Shutting down");
}

async fn handle_connection(
    ctx: std::sync::Arc<context::AppContext>,
    client_ip_resolver: &client_ip::Resolver,
    accept_result: Result<(tokio::net::TcpStream, SocketAddr), std::io::Error>,
    timeout_counter: metrics::Counter,
    error_counter: metrics::Counter,
) {
    match accept_result {
        Ok((stream, addr)) => {
            if let Err(e) = stream.set_nodelay(true) {
                tracing::error!(
                    event = "server.connection.tcp_nodelay_failed", error = %e, "Failed to set TCP_NODELAY");
            }
            let io = TokioIo::new(stream);
            let client_ip_resolver = client_ip_resolver.clone();
            tokio::task::spawn(async move {
                let start_time = std::time::Instant::now();
                let tcp_connections_active = gauge!("boluo_server_tcp_connections_active");
                counter!("boluo_server_tcp_connections_total").increment(1);
                tcp_connections_active.increment(1);

                let connection_timeout = std::time::Duration::from_secs(32);

                let (timeout_reset_tx, mut timeout_reset_rx) =
                    watch::channel(std::time::Instant::now());

                let handler_with_reset = move |mut req: Request<Incoming>| {
                    let tx = timeout_reset_tx.clone();
                    let ctx = ctx.clone();
                    client_ip_resolver.attach(addr.ip(), &mut req);
                    async move {
                        // Reset timeout on each request
                        let _ = tx.send(std::time::Instant::now());
                        handler(&ctx, req).await
                    }
                };

                let builder = AutoBuilder::new(TokioExecutor::new());
                let connection_future =
                    builder.serve_connection_with_upgrades(io, service_fn(handler_with_reset));

                pin_mut!(connection_future);

                let timeout_task = async move {
                    let mut last_reset = std::time::Instant::now();
                    loop {
                        let remaining_time =
                            connection_timeout.saturating_sub(last_reset.elapsed());

                        if remaining_time.is_zero() {
                            break;
                        }

                        tokio::select! {
                            _ = tokio::time::sleep(remaining_time) => {
                                break;
                            }
                            result = timeout_reset_rx.changed() => {
                                if result.is_ok() {
                                    last_reset = *timeout_reset_rx.borrow_and_update();
                                } else {
                                    tracing::warn!(
                                        event = "server.connection.timeout_reset_closed",
                                        addr = %addr,
                                        "HTTP connection timeout reset channel closed"
                                    );
                                    break;
                                }
                            }
                        }
                    }
                };

                tokio::select! {
                    conn_result = &mut connection_future => {
                        match conn_result {
                            Ok(()) => {},
                            Err(err) => {
                                tracing::warn!(
                                    event = "server.connection.error",
                                    error = %err,
                                    addr = %addr,
                                    "HTTP connection error"
                                );
                                error_counter.increment(1);
                            },
                        }
                    }
                    _ = shutdown::SHUTDOWN.notified() => {
                        connection_future.as_mut().graceful_shutdown();
                    }
                    _ = timeout_task => {
                        timeout_counter.increment(1);

                        connection_future.as_mut().graceful_shutdown();

                        if let Err(err) = connection_future.await {
                            tracing::warn!(
                                event = "server.connection.graceful_shutdown_failed",
                                error = %err,
                                addr = %addr,
                                "Error during graceful shutdown"
                            );
                        }

                        tracing::info!(addr = %addr, "HTTP connection timeout after {}s", start_time.elapsed().as_secs());
                    }
                };

                tcp_connections_active.decrement(1);
                metrics::histogram!("boluo_server_tcp_connection_duration_ms")
                    .record(start_time.elapsed().as_millis() as f64);
            });
        }
        Err(err) => {
            tracing::error!(
                event = "server.connection.accept_failed", error = %err, "Failed to accept connection");
        }
    }
}
