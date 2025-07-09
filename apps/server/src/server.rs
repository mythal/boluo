#![allow(dead_code)]
#![allow(
    clippy::too_many_arguments,
    clippy::needless_return,
    clippy::collapsible_if
)]

use std::env;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};

use clap::Parser;
use http_body_util::Full;
use hyper::body::Incoming;
use hyper::header::ORIGIN;
use hyper::server::conn::http1;
use hyper_util::rt::TokioIo;
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
        let target = "https://old.boluo.chat".to_string() + &path;
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
        let ipv4_addr: Result<Ipv4Addr, _> = host_env.parse();
        if let Ok(addr) = ipv4_addr {
            IpAddr::V4(addr)
        } else {
            let ipv6_addr: Result<Ipv6Addr, _> = host_env.parse();
            ipv6_addr
                .map(IpAddr::V6)
                .expect("HOST must be a valid IPv4 or IPv6 address")
        }
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

    if args.check {
        return;
    }

    // https://tokio.rs/tokio/topics/shutdown
    let mut terminate_stream =
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to create signal stream");
    let http = http1::Builder::new();

    tracing::info!("Startup ID: {}", events::startup_id());
    loop {
        tokio::select! {
            accept_result = listener.accept() => {
                handle_connection(accept_result, &http).await;
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
    http: &http1::Builder,
) {
    match accept_result {
        Ok((stream, addr)) => {
            let io = TokioIo::new(stream);
            let conn = http
                .serve_connection(io, service_fn(handler))
                .with_upgrades();
            tokio::task::spawn(async move {
                if let Err(err) = conn.await {
                    tracing::warn!(error = %err, addr = %addr, "HTTP connection error");
                }
            });
        }
        Err(err) => {
            tracing::warn!(error = %err, "Failed to accept connection");
        }
    }
}
