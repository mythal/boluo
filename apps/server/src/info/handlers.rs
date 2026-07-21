use std::cell::RefCell;
use std::sync::{Arc, LazyLock};
use std::time::Duration;

use super::models::{BasicInfo, Proxy};
use crate::info::models::AppSettings;
use crate::interface::ok_response;
use crate::{error::AppError, interface::Response};
use futures::future::join_all;
use hyper::body::Incoming;
use hyper::{Method, Request};
use sqlx::query_as;

const PROXY_HEALTH_CHECK_PATH: &str = "/api/info";
const PROXY_HEALTH_CHECK_TIMEOUT: Duration = Duration::from_secs(3);

static PROXY_HEALTH_CHECK_CLIENT: LazyLock<Result<reqwest::Client, reqwest::Error>> =
    LazyLock::new(build_proxy_health_check_client);

fn build_proxy_health_check_client() -> Result<reqwest::Client, reqwest::Error> {
    let root_store =
        rustls::RootCertStore::from_iter(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let provider = Arc::new(rustls::crypto::aws_lc_rs::default_provider());
    let tls_config = rustls::ClientConfig::builder_with_provider(provider)
        .with_safe_default_protocol_versions()
        .expect("AWS-LC supports rustls default protocol versions")
        .with_root_certificates(root_store)
        .with_no_client_auth();

    reqwest::Client::builder()
        .tls_backend_preconfigured(tls_config)
        .connect_timeout(PROXY_HEALTH_CHECK_TIMEOUT)
        .timeout(PROXY_HEALTH_CHECK_TIMEOUT)
        .build()
}

#[derive(Debug, Clone, Default)]
pub struct ProxiesCache {
    proxies: Vec<Proxy>,
    timestamp: Option<u64>,
}

thread_local! {
    pub static PROXIES: RefCell<ProxiesCache> = RefCell::new(ProxiesCache::default());
}

async fn is_proxy_alive(client: &reqwest::Client, proxy: &Proxy) -> bool {
    let health_check_url = format!(
        "{}{}",
        proxy.url.trim_end_matches('/'),
        PROXY_HEALTH_CHECK_PATH
    );

    let response = match client.get(&health_check_url).send().await {
        Ok(response) => response,
        Err(error) => {
            tracing::warn!(
                proxy_name = proxy.name,
                proxy_url = proxy.url,
                error = %error,
                "Proxy health check failed"
            );
            return false;
        }
    };

    if response.status() != reqwest::StatusCode::OK {
        tracing::warn!(
            proxy_name = proxy.name,
            proxy_url = proxy.url,
            status = %response.status(),
            "Proxy health check returned an unexpected status"
        );
        return false;
    }

    match response.json::<BasicInfo>().await {
        Ok(_) => true,
        Err(error) => {
            tracing::warn!(
                proxy_name = proxy.name,
                proxy_url = proxy.url,
                error = %error,
                "Proxy health check returned an invalid response body"
            );
            false
        }
    }
}

async fn filter_alive_proxies(proxies: Vec<Proxy>) -> Vec<Proxy> {
    let client = match PROXY_HEALTH_CHECK_CLIENT.as_ref() {
        Ok(client) => client,
        Err(error) => {
            tracing::error!(error = %error, "Failed to build proxy health check client");
            return Vec::new();
        }
    };
    let checks = proxies
        .into_iter()
        .map(|proxy| async move {
            if is_proxy_alive(client, &proxy).await {
                Some(proxy)
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    join_all(checks).await.into_iter().flatten().collect()
}

pub async fn get_proxies(ctx: &crate::context::AppContext) -> Result<Vec<Proxy>, AppError> {
    fn make_timestamp() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("Unexpected failture in get timestamp")
            .as_secs()
    }
    let now = make_timestamp();
    let mut proxies: ProxiesCache = ProxiesCache::default();
    PROXIES.with(|x| {
        proxies = x.borrow().clone();
    });
    if let Some(timestamp) = proxies.timestamp {
        if now - timestamp < 60 {
            return Ok(proxies.proxies);
        }
    }

    let proxies: Vec<Proxy> = query_as!(
        Proxy,
        r#"SELECT "name", "url", "region" FROM "proxies" WHERE "is_enabled" = TRUE;"#
    )
    .fetch_all(&ctx.db)
    .await
    .map_err(AppError::from)?;
    let proxies = filter_alive_proxies(proxies).await;
    PROXIES.with(|x| {
        x.borrow_mut().proxies = proxies.clone();
        x.borrow_mut().timestamp = Some(now);
    });
    Ok(proxies)
}

pub async fn proxies(ctx: &crate::context::AppContext) -> Result<Response, AppError> {
    let proxies: Vec<Proxy> = get_proxies(ctx).await?;
    let Ok(Ok(body)) = tokio::task::spawn_blocking(move || serde_json::to_string(&proxies)).await
    else {
        return Err(AppError::Unexpected(anyhow::anyhow!(
            "Failed to serialize proxies"
        )));
    };
    let response = hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(body.into())
        .expect("Unexpected failture in build proxies response");
    Ok(response)
}

pub fn basic_info() -> Response {
    use std::sync::OnceLock;
    static BASIC_INFO: OnceLock<String> = OnceLock::new();
    let body = BASIC_INFO.get_or_init(|| {
        serde_json::to_string(&BasicInfo::new())
            .expect("Unexpected failture in serialize version information")
    });

    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .status(hyper::StatusCode::OK)
        .body(body.as_str().into())
        .expect("Unexpected failture in build version response")
}

pub fn settings() -> Response {
    use std::sync::LazyLock;
    static SETTINGS: LazyLock<Response> = LazyLock::new(|| ok_response(AppSettings::new()));
    SETTINGS.clone()
}

pub fn echo(req: Request<Incoming>) -> Response {
    hyper::Response::builder()
        .header(hyper::header::CONTENT_TYPE, "text/plain")
        .status(hyper::StatusCode::OK)
        .body(format!("{:?}", req.headers()).into_bytes())
        .unwrap_or_default()
}

pub async fn router(
    ctx: &crate::context::AppContext,
    req: Request<Incoming>,
    path: &str,
) -> Result<Response, AppError> {
    match (path, req.method().clone()) {
        ("/proxies", Method::GET) => proxies(ctx).await,
        ("/settings", Method::GET) => Ok(settings()),
        ("/echo", Method::GET) => Ok(echo(req)),
        _ => Ok(basic_info()),
    }
}

#[cfg(test)]
mod tests {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    use super::*;

    async fn proxy_for_response(status: &str, body: &str) -> Proxy {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let response = format!(
            "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        );
        tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut request = [0; 1024];
            let _ = stream.read(&mut request).await.unwrap();
            stream.write_all(response.as_bytes()).await.unwrap();
        });
        Proxy {
            name: status.to_owned(),
            url: format!("http://{address}/"),
            region: String::new(),
        }
    }

    #[tokio::test]
    async fn proxy_filter_keeps_only_valid_info_responses() {
        let alive = proxy_for_response("200 OK", r#"{"version":"1.0.0"}"#).await;
        let unavailable =
            proxy_for_response("503 Service Unavailable", r#"{"version":"1.0.0"}"#).await;
        let invalid_json = proxy_for_response("200 OK", "not json").await;
        let missing_version = proxy_for_response("200 OK", r#"{"status":"ok"}"#).await;

        let proxies = filter_alive_proxies(vec![
            alive.clone(),
            unavailable,
            invalid_json,
            missing_version,
        ])
        .await;

        assert_eq!(proxies.len(), 1);
        assert_eq!(proxies[0].url, alive.url);
    }

    #[tokio::test]
    async fn proxy_health_check_rejects_invalid_url() {
        let client = build_proxy_health_check_client().unwrap();
        let proxy = Proxy {
            name: "invalid".to_owned(),
            url: "not a URL".to_owned(),
            region: String::new(),
        };

        assert!(!is_proxy_alive(&client, &proxy).await);
    }
}
