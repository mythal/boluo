use std::net::{TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::str::FromStr;

use sqlx_postgres::PgConnectOptions;

fn main() {
    dotenvy::from_filename(".env.local").ok();
    dotenvy::dotenv().ok();

    println!("cargo:rerun-if-changed=.env.local");
    println!("cargo:rerun-if-env-changed=DATABASE_URL");
    println!("cargo:rerun-if-env-changed=SQLX_OFFLINE");

    if let Ok(url) = std::env::var("DATABASE_URL") {
        println!("cargo::rustc-env=DATABASE_URL={url}");
        println!("cargo:rerun-if-changed=migrations");
    }

    if std::env::var("PROFILE").as_deref() == Ok("release") {
        return;
    }

    if std::env::var("SQLX_OFFLINE").is_ok() {
        return;
    }

    // Auto-detect: try to TCP-connect to the database
    let reachable = std::env::var("DATABASE_URL")
        .ok()
        .as_deref()
        .and_then(parse_db_target)
        .map(|target| target.is_reachable())
        .unwrap_or(false);

    if !reachable {
        println!("cargo::rustc-env=SQLX_OFFLINE=true");
    }
}

enum DbTarget {
    Tcp { host: String, port: u16 },
    UnixSocket(PathBuf),
}

impl DbTarget {
    fn is_reachable(&self) -> bool {
        match self {
            Self::Tcp { host, port } => (host.as_str(), *port)
                .to_socket_addrs()
                .map(|addrs| {
                    addrs.into_iter().any(|addr| {
                        TcpStream::connect_timeout(&addr, std::time::Duration::from_millis(500))
                            .is_ok()
                    })
                })
                .unwrap_or(false),
            Self::UnixSocket(path) => connect_unix_socket(path),
        }
    }
}

fn parse_db_target(url: &str) -> Option<DbTarget> {
    let options = PgConnectOptions::from_str(url).ok()?;
    let port = options.get_port();

    if let Some(socket_dir) = options.get_socket() {
        return Some(DbTarget::UnixSocket(postgres_socket_path(socket_dir, port)));
    }

    let host = options.get_host();
    if host.starts_with('/') {
        return Some(DbTarget::UnixSocket(postgres_socket_path(host, port)));
    }

    Some(DbTarget::Tcp {
        host: host.to_owned(),
        port,
    })
}

fn postgres_socket_path(socket_dir: impl AsRef<Path>, port: u16) -> PathBuf {
    socket_dir.as_ref().join(format!(".s.PGSQL.{port}"))
}

#[cfg(unix)]
fn connect_unix_socket(path: &Path) -> bool {
    std::os::unix::net::UnixStream::connect(path).is_ok()
}

#[cfg(not(unix))]
fn connect_unix_socket(_path: &Path) -> bool {
    false
}
