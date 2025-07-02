#![allow(dead_code)]
#![allow(clippy::too_many_arguments, clippy::needless_return)]

use std::env;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};

use crate::context::debug;
use clap::Parser;
use http_body_util::Full;
use hyper::body::Incoming;
use hyper::header::ORIGIN;
use hyper::server::conn::http1;
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;

use hyper::service::service_fn;
use hyper::Request;

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
mod logger;
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
    use std::time::Instant;
    let start = Instant::now();
    let method = req.method().clone();
    let method = method.as_str();
    let origin = req
        .headers()
        .get(ORIGIN)
        .and_then(|x| x.to_str().ok())
        .map(|x| x.to_owned());
    let uri = req.uri().clone();
    if req.method() == hyper::Method::OPTIONS {
        return Ok(cors::preflight_requests(req));
    }
    let response = router(req).await;
    let mut has_error = false;
    let response = allow_origin(
        origin.as_deref(),
        match response {
            Ok(response) => response.map(|bytes| Full::new(bytes.into())),
            Err(e) => {
                if let AppError::NotFound(_) = e {
                    // Do not log 404
                } else {
                    has_error = true;
                }
                error::log_error(&e, &uri);
                err_response(e).map(|bytes| Full::new(bytes.into()))
            }
        },
    );

    if has_error {
        tracing::warn!("{} {} {:?}", method, &uri, start.elapsed());
    } else if uri.path().starts_with("/api/info") {
        // do nothing
    } else if uri.path().starts_with("/api/users/get_me") {
        tracing::debug!("{} {} {:?}", method, &uri, start.elapsed());
    } else {
        tracing::info!("{} {} {:?}", method, &uri, start.elapsed());
    }
    Ok(response)
}

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
    dotenv::from_filename(".env.local").ok();
    dotenv::dotenv().ok();
    logger::setup_logger(debug()).unwrap();

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
            tracing::debug!("Accepted connection from: {}", addr);
            let io = TokioIo::new(stream);
            let conn = http
                .serve_connection(io, service_fn(handler))
                .with_upgrades();
            tokio::task::spawn(async move {
                if let Err(err) = conn.await {
                    tracing::error!("server error: {}", err);
                }
            });
        }
        Err(err) => {
            tracing::debug!("Failed to accept: {}", err);
        }
    }
}
