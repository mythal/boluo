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
        .and_then(parse_db_addr)
        .map(|addr| {
            std::net::TcpStream::connect_timeout(&addr, std::time::Duration::from_millis(500))
                .is_ok()
        })
        .unwrap_or(false);

    if !reachable {
        println!("cargo::rustc-env=SQLX_OFFLINE=true");
    }
}

fn parse_db_addr(url: &str) -> Option<std::net::SocketAddr> {
    let url = url::Url::parse(url).ok()?;
    let host = url.host_str()?;
    let port = url.port().unwrap_or(5432);
    format!("{host}:{port}").parse().ok()
}
