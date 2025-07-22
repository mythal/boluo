#![allow(dead_code)]
#![allow(
    clippy::too_many_arguments,
    clippy::needless_return,
    clippy::collapsible_if
)]

use std::env;
use std::net::{IpAddr, SocketAddr};

use clap::Parser;
use http_body_util::Full;
use hyper::body::Incoming;
use hyper::header::ORIGIN;
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::server::conn::auto::Builder as AutoBuilder;
use metrics::{counter, gauge};
use tokio::net::TcpListener;

use hyper::Request;
use hyper::service::service_fn;

#[macro_use]
mod utils;
#[macro_use]
mod error;
mod cache;
mod channels;
mod context;
mod cors;
mod csrf;
mod db;
mod events;
mod info;
mod interface;
mod mail;
mod media;
mod messages;
mod notify;
mod pos;
mod pubsub;
mod redis;
mod s3;
mod server_metrics;
mod session;
mod shutdown;
mod spaces;
mod ts;
mod ttl;
mod users;
mod validators;
mod websocket;

use crate::cors::allow_origin;
use crate::error::AppError;
use crate::interface::{err_response, missing, ok_response};

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

async fn router(req: Request<Incoming>) -> Result<interface::Response, AppError> {
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
                return $handler(req, stripped).await;
            }
        };
    }
    if path == "/api/csrf-token" {
        return csrf::get_csrf_token(req).await.map(ok_response);
    }
    table!("/api/info", info::router);
    table!("/api/messages", messages::router);
    table!("/api/users", users::router);
    table!("/api/media", media::router);
    table!("/api/channels", channels::router);
    table!("/api/spaces", spaces::router);
    table!("/api/events", events::router);
    missing()
}

async fn handler(
    req: Request<Incoming>,
) -> Result<hyper::Response<Full<hyper::body::Bytes>>, hyper::Error> {
    use tracing::Instrument as _;

    let method = req.method().clone();
    let uri = req.uri().clone();
    let path = uri.path();
    let query = uri.query().unwrap_or("");

    let client_version = req
        .headers()
        .get(hyper::header::HeaderName::from_static("x-client-version"))
        .and_then(|x| x.to_str().ok())
        .unwrap_or("");

    // Create a span for this HTTP request with structured fields
    let span = tracing::info_span!(
        "http_request",
        method = %method,
        path = %path,
        query = %query,
        status_code = tracing::field::Empty,
        duration_ms = tracing::field::Empty,
        user_id = tracing::field::Empty,
        error = tracing::field::Empty,
        auth_method = tracing::field::Empty,
        client = %client_version,
    );

    let start = std::time::Instant::now();

    // Extract origin for CORS
    let origin = req
        .headers()
        .get(ORIGIN)
        .and_then(|x| x.to_str().ok())
        .map(|x| x.to_owned());

    // Handle preflight requests quickly
    if req.method() == hyper::Method::OPTIONS {
        let response = cors::preflight_requests(req);
        span.record("status_code", 200);
        span.record("duration_ms", start.elapsed().as_millis() as u64);
        return Ok(response);
    }

    // Route the request
    async {
        let response = router(req).await;
        let duration = start.elapsed();
        let span = tracing::Span::current();

        let response = allow_origin(
            origin.as_deref(),
            match response {
                Ok(response) => {
                    span.record("status_code", response.status().as_u16());
                    span.record("duration_ms", duration.as_millis() as u64);

                    if duration.as_millis() > 500 {
                        tracing::warn!("Slow request: {}ms", duration.as_millis());
                    } else if path.starts_with("/api/info")
                        || path.starts_with("/api/users/get_me")
                        || path.starts_with("/api/events/connect")
                    {
                        tracing::debug!("Request Finished");
                    } else {
                        tracing::info!("Request Finished");
                    }
                    response.map(|bytes| Full::new(bytes.into()))
                }
                Err(e) => {
                    let status_code = e.status_code().as_u16();
                    span.record("status_code", status_code);
                    span.record("duration_ms", duration.as_millis() as u64);
                    span.record("error", format!("{e}").as_str());

                    error::log_error(&e, &uri);

                    err_response(e).map(|bytes| Full::new(bytes.into()))
                }
            },
        );

        Ok(response)
    }
    .instrument(span)
    .await
}

#[tracing::instrument]
async fn storage_check() {
    // Skip in CI
    if context::ci() {
        return;
    }
    let s3_client = s3::get_client();
    let _put_object_output = s3_client
        .put_object()
        .bucket(s3::get_bucket_name())
        .key("check")
        .body(Vec::<u8>::new().into())
        .send()
        .await
        .expect("Cannot connect to bucket");
    tracing::info!("Object Storage is ready");
}
#[derive(Parser)]
struct Args {
    #[clap(long, help = "check only", default_value = "false")]
    check: bool,
    #[clap(long, help = "export typescript types", default_value = "false")]
    types: bool,
}

#[tokio::main]
async fn main() {
    use sysinfo::System;
    use tracing_subscriber::filter::{EnvFilter, LevelFilter};
    dotenvy::from_filename(".env.local").ok();
    dotenvy::dotenv().ok();
    let filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy();
    tracing_subscriber::fmt().with_env_filter(filter).init();

    let args = Args::parse();
    if args.types {
        ts::export();
        return;
    }

    let port: u16 = env::var("PORT")
        .unwrap_or("3000".to_string())
        .parse()
        .expect("PORT must be a number");
    storage_check().await;

    let ip_addr: IpAddr = {
        let host_env = env::var("HOST").unwrap_or("127.0.0.1".to_string());
        host_env.parse().expect("HOST must be a valid IP address")
    };

    let socket = SocketAddr::new(ip_addr, port);

    let listener = TcpListener::bind(socket)
        .await
        .expect("Failed to bind address");

    tracing::info!("Server listening on: {}", socket);

    db::check().await;
    tracing::info!("Database is ready");
    redis::check().await;
    tracing::info!("Redis is ready");

    if context::SITE_URL.is_none() {
        tracing::error!("SITE_URL is not set");
    }
    if context::APP_URL.is_none() {
        tracing::error!("APP_URL is not set");
    }
    if context::PUBLIC_MEDIA_URL.is_none() {
        tracing::error!("PUBLIC_MEDIA_URL is not set");
    }

    server_metrics::init_metrics().await;

    if args.check {
        return;
    }

    if let Ok(exporter_listen) = std::env::var("PROMETHEUS_EXPORTER") {
        let addr = exporter_listen
            .parse::<SocketAddr>()
            .expect("Invalid address for Prometheus exporter");
        metrics_exporter_prometheus::PrometheusBuilder::new()
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
    // https://tokio.rs/tokio/topics/shutdown
    let mut terminate_stream =
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to create signal stream");

    server_metrics::start_update_metrics();
    tracing::info!("Startup ID: {}", events::startup_id());

    tracing::info!("Kernel: {}", System::kernel_long_version());

    tracing::info!(
        "Open file limit: {}",
        System::open_files_limit().unwrap_or(0)
    );

    let timeout_counter = metrics::counter!("boluo_server_tcp_connections_timeout_total");
    let error_counter = metrics::counter!("boluo_server_tcp_connections_error_total");

    loop {
        tokio::select! {
            accept_result = listener.accept() => {
                handle_connection(accept_result, timeout_counter.clone(), error_counter.clone()).await;
            },
            _ = terminate_stream.recv() => {
                tracing::info!("Graceful shutdown signal received");
                break;
            },
        }
    }
    shutdown::SHUTDOWN.notify_waiters();
    tokio::time::sleep(std::time::Duration::from_secs(4)).await;
    tracing::info!("Shutting down");
}

async fn handle_connection(
    accept_result: Result<(tokio::net::TcpStream, SocketAddr), std::io::Error>,
    timeout_counter: metrics::Counter,
    error_counter: metrics::Counter,
) {
    match accept_result {
        Ok((stream, addr)) => {
            let io = TokioIo::new(stream);
            tokio::task::spawn(async move {
                let start_time = std::time::Instant::now();
                let tcp_connections_active = gauge!("boluo_server_tcp_connections_active");
                counter!("boluo_server_tcp_connections_total").increment(1);
                tcp_connections_active.increment(1);

                let connection_timeout = std::time::Duration::from_secs(30);

                let builder = AutoBuilder::new(TokioExecutor::new());
                let connection_future =
                    builder.serve_connection_with_upgrades(io, service_fn(handler));

                // Maybe we should use hyper-timeout
                // https://crates.io/crates/hyper-timeout
                let result = tokio::time::timeout(connection_timeout, connection_future).await;

                match result {
                    Ok(Ok(())) => {}
                    Ok(Err(err)) => {
                        tracing::warn!(error = %err, addr = %addr, "HTTP/1 connection error");
                        error_counter.increment(1);
                    }
                    Err(_) => {
                        tracing::info!(addr = %addr, "HTTP/1 connection timeout after {}s", connection_timeout.as_secs());
                        timeout_counter.increment(1);
                    }
                }

                tcp_connections_active.decrement(1);
                metrics::histogram!("boluo_server_tcp_connection_duration_ms")
                    .record(start_time.elapsed().as_millis() as f64);
            });
        }
        Err(err) => {
            tracing::error!(error = %err, "Failed to accept connection");
        }
    }
}
