#![allow(dead_code)]
#![allow(clippy::too_many_arguments)]

use std::env;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use crate::context::debug;
use clap::Parser;
use hyper::header::ORIGIN;
use hyper::server::conn::AddrStream;
use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Request, Server};
use tokio::signal::unix::{signal, SignalKind};

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
mod pos;
mod s3;
mod session;
mod spaces;
mod users;
mod validators;
mod websocket;

use crate::cors::allow_origin;
use crate::error::AppError;
use crate::interface::{err_response, missing, ok_response, Response};
#[cfg(not(target_env = "msvc"))]
use tikv_jemallocator::Jemalloc;

#[cfg(not(target_env = "msvc"))]
#[global_allocator]
static GLOBAL: Jemalloc = Jemalloc;

async fn router(req: Request<Body>) -> Result<Response, AppError> {
    let path = req.uri().path().to_string();
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

async fn handler(req: Request<Body>) -> Result<Response, hyper::Error> {
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
            Ok(response) => response,
            Err(e) => {
                has_error = true;
                error::log_error(&e, &uri);
                err_response(e)
            }
        },
    );

    if has_error {
        log::warn!("{} {} {:?}", method, &uri, start.elapsed());
    } else if uri.path().starts_with("/api/info") {
        // do nothing
    } else if uri.path().starts_with("/api/users/get_me") {
        log::debug!("{} {} {:?}", method, &uri, start.elapsed());
    } else {
        log::info!("{} {} {:?}", method, &uri, start.elapsed());
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
    log::info!("Object Storage is ready");
}

#[derive(Parser)]
struct Args {
    #[clap(long, help = "check only", default_value = "false")]
    check: bool,
}

#[tokio::main]
async fn main() {
    dotenv::from_filename(".env.local").ok();
    dotenv::dotenv().ok();
    logger::setup_logger(debug()).unwrap();

    let args = Args::parse();

    let port: u16 = env::var("PORT")
        .expect("PORT must be set")
        .parse()
        .expect("PORT must be a number");
    storage_check().await;

    let addr: Ipv4Addr = env::var("HOST")
        .unwrap_or("127.0.0.1".to_string())
        .parse()
        .expect("HOST must be a IPv4 address");

    let addr = SocketAddr::new(IpAddr::V4(addr), port);

    let make_svc = make_service_fn(|_: &AddrStream| async { Ok::<_, hyper::Error>(service_fn(handler)) });

    cache::check().await;
    log::info!("Cache is ready");
    db::check().await;
    log::info!("Database is ready");

    if args.check {
        return;
    }

    let server = Server::bind(&addr).serve(make_svc);
    events::tasks::start();
    messages::tasks::start();
    // https://tokio.rs/tokio/topics/shutdown
    let mut stream = signal(SignalKind::terminate()).unwrap();

    #[allow(clippy::never_loop)]
    loop {
        tokio::select! {
            _ = stream.recv() => log::info!("Shutdown boluo server"),
            Err(e) = server => log::error!("server error: {}", e),
        }
        break;
    }
}
