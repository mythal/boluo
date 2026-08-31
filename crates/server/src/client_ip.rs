//! Resolve client addresses without trusting caller-controlled forwarding headers.

use std::cmp::Reverse;
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::Context as _;
use arc_swap::ArcSwap;
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use futures::{StreamExt, stream};
use hyper::{HeaderMap, Request};
use ipnet::IpNet;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

const X_FORWARDED_FOR: hyper::header::HeaderName =
    hyper::header::HeaderName::from_static("x-forwarded-for");
// Official CDN address sources. Embedded snapshots make cold starts independent
// of these endpoints; the server refreshes them in the background every six hours.
// Cloudflare: https://www.cloudflare.com/ips/
// Fastly: https://www.fastly.com/documentation/reference/api/utils/public-ip-list/
// CloudFront: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html
const CLOUDFLARE_PROXY_LIST_URLS: [&str; 2] = [
    "https://www.cloudflare.com/ips-v4/",
    "https://www.cloudflare.com/ips-v6/",
];
const FASTLY_PROXY_LIST_URL: &str = "https://api.fastly.com/public-ip-list";
const CLOUDFRONT_PROXY_LIST_URL: &str = "https://ip-ranges.amazonaws.com/ip-ranges.json";
const DEFAULT_CLOUDFLARE_PROXY_LIST: &str = include_str!("../text/ips-cloudflare.txt");
const DEFAULT_FASTLY_PROXY_LIST: &str = include_str!("../text/ips-fastly.txt");
const DEFAULT_CLOUDFRONT_PROXY_LIST: &str = include_str!("../text/ips-cloudfront.txt");
const MAX_PLAIN_PROXY_LIST_BYTES: usize = 64 * 1024;
const MAX_CLOUDFRONT_LIST_BYTES: usize = 8 * 1024 * 1024;
const PROXY_PROBE_HEADER: hyper::header::HeaderName =
    hyper::header::HeaderName::from_static("x-boluo-proxy-probe");
const PROXY_PROBE_SIGNATURE_HEADER: hyper::header::HeaderName =
    hyper::header::HeaderName::from_static("x-boluo-proxy-probe-signature");
const PROXY_PROBE_PATH: &str = "/api/info/proxy-probe";
const PROXY_PROBE_LIFETIME: Duration = Duration::from_secs(30);
const PROXY_PROBE_RESPONSE_LIMIT: usize = 4096;
const PROXY_PROBE_STALE_AFTER: Duration = Duration::from_secs(10 * 60);
const MAX_PROBED_ADDRESSES_PER_PROXY: usize = 32;
const MAX_FORWARDED_HOPS: usize = 32;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ClientIp(IpAddr);

impl ClientIp {
    pub fn require<B>(request: &Request<B>) -> Result<IpAddr, crate::error::AppError> {
        request
            .extensions()
            .get::<Self>()
            .map(|value| value.0)
            .ok_or_else(|| {
                crate::error::AppError::Unexpected(anyhow::anyhow!(
                    "request is missing its resolved client IP"
                ))
            })
    }
}

/// The normalized path observed at the transport boundary. The final address
/// is the peer nearest to the application after removing platform-only hops.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
struct ObservedPath {
    hops: Vec<IpAddr>,
}

impl<'de> Deserialize<'de> for ObservedPath {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct Repr {
            hops: Vec<IpAddr>,
        }

        let Repr { hops } = Repr::deserialize(deserializer)?;
        if hops.is_empty() {
            return Err(serde::de::Error::custom(
                "an observed transport path must have an anchor",
            ));
        }
        if hops.len() > MAX_FORWARDED_HOPS {
            return Err(serde::de::Error::custom(format_args!(
                "an observed transport path cannot exceed {MAX_FORWARDED_HOPS} hops"
            )));
        }
        Ok(Self { hops })
    }
}

impl ObservedPath {
    fn direct(anchor: IpAddr) -> Self {
        Self { hops: vec![anchor] }
    }

    fn anchor(&self) -> IpAddr {
        *self
            .hops
            .last()
            .expect("an observed transport path always has an anchor")
    }

    fn upstream_of_anchor(&self) -> Option<IpAddr> {
        self.hops.iter().rev().nth(1).copied()
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct ProbeClaims {
    purpose: String,
    proxy_url: String,
    nonce: Uuid,
    expires_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProbeResponse {
    proxy_url: String,
    nonce: Uuid,
    observed: ObservedPath,
}

#[derive(Clone, Debug)]
struct ProbedAddress {
    network: IpNet,
    observed_at: Instant,
}

type ProbedProxyAddresses = HashMap<String, Vec<ProbedAddress>>;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq, clap::ValueEnum)]
pub enum CdnProvider {
    Cloudflare,
    Fastly,
    #[value(name = "cloudfront")]
    CloudFront,
}

impl CdnProvider {
    fn name(self) -> &'static str {
        match self {
            Self::Cloudflare => "cloudflare",
            Self::Fastly => "fastly",
            Self::CloudFront => "cloudfront",
        }
    }

    fn embedded_ranges(self) -> Arc<[IpNet]> {
        let body = match self {
            Self::Cloudflare => DEFAULT_CLOUDFLARE_PROXY_LIST,
            Self::Fastly => DEFAULT_FASTLY_PROXY_LIST,
            Self::CloudFront => DEFAULT_CLOUDFRONT_PROXY_LIST,
        };
        parse_proxy_list(body)
            .unwrap_or_else(|error| {
                panic!(
                    "the embedded {} proxy list must contain valid CIDRs: {error}",
                    self.name()
                )
            })
            .into()
    }
}

type CdnRanges = HashMap<CdnProvider, Arc<[IpNet]>>;

fn merge_probe_observation(
    previous: Option<&[ProbedAddress]>,
    observed: Option<IpNet>,
    now: Instant,
) -> Vec<ProbedAddress> {
    let mut addresses = previous
        .unwrap_or_default()
        .iter()
        .filter(|address| {
            now.saturating_duration_since(address.observed_at) <= PROXY_PROBE_STALE_AFTER
        })
        .cloned()
        .collect::<Vec<_>>();

    if let Some(network) = observed {
        if let Some(address) = addresses
            .iter_mut()
            .find(|address| address.network == network)
        {
            address.observed_at = now;
        } else {
            addresses.push(ProbedAddress {
                network,
                observed_at: now,
            });
        }
    }

    addresses.sort_unstable_by_key(|address| Reverse(address.observed_at));
    addresses.truncate(MAX_PROBED_ADDRESSES_PER_PROXY);
    addresses
}

#[derive(Clone, Debug)]
struct TrustSnapshot {
    configured: Arc<[IpNet]>,
    cdn_ranges: Arc<CdnRanges>,
    probed: Arc<ProbedProxyAddresses>,
}

impl TrustSnapshot {
    fn new(configured: Vec<IpNet>, cdn_providers: &[CdnProvider]) -> Self {
        let cdn_ranges = cdn_providers
            .iter()
            .map(|provider| (*provider, provider.embedded_ranges()))
            .collect();
        Self {
            configured: configured.into(),
            cdn_ranges: Arc::new(cdn_ranges),
            probed: Arc::new(HashMap::new()),
        }
    }

    fn contains(&self, ip: IpAddr) -> bool {
        self.contains_static(ip)
            || self
                .probed
                .values()
                .flatten()
                .any(|address| address.network.contains(&ip))
    }

    fn contains_static(&self, ip: IpAddr) -> bool {
        self.configured
            .iter()
            .chain(
                self.cdn_ranges
                    .values()
                    .flat_map(|networks| networks.iter()),
            )
            .any(|network| network.contains(&ip))
    }
}

#[derive(Clone, Debug)]
pub struct Ingress {
    trusted_client_ip_header: Option<hyper::header::HeaderName>,
    forwarded_suffix_hops: usize,
}

impl Ingress {
    pub fn bare_metal() -> Self {
        Self {
            trusted_client_ip_header: None,
            forwarded_suffix_hops: 0,
        }
    }

    pub fn trusted_header(header: hyper::header::HeaderName, forwarded_suffix_hops: usize) -> Self {
        Self {
            trusted_client_ip_header: Some(header),
            forwarded_suffix_hops,
        }
    }
}

#[derive(Clone, Debug)]
pub struct Resolver {
    trust: Arc<ArcSwap<TrustSnapshot>>,
    ingress: Ingress,
    http_client: reqwest::Client,
}

impl Resolver {
    pub fn new(
        trusted_proxies: Vec<IpNet>,
        cdn_providers: &[CdnProvider],
        ingress: Ingress,
    ) -> Self {
        Self {
            trust: Arc::new(ArcSwap::from_pointee(TrustSnapshot::new(
                trusted_proxies,
                cdn_providers,
            ))),
            ingress,
            http_client: crate::http_client::builder()
                .connect_timeout(Duration::from_secs(5))
                .timeout(Duration::from_secs(10))
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .expect("client IP HTTP client configuration is valid"),
        }
    }

    /// Resolve and attach the client address for use by any downstream handler.
    pub fn attach<B>(&self, peer_ip: IpAddr, request: &mut Request<B>) -> IpAddr {
        let path = self.observed_path(peer_ip, request.headers());
        let client_ip = self.resolve_observed(&path);
        request.extensions_mut().insert(path);
        request.extensions_mut().insert(ClientIp(client_ip));
        client_ip
    }

    fn resolve(&self, peer_ip: IpAddr, headers: &HeaderMap) -> IpAddr {
        let path = self.observed_path(peer_ip, headers);
        self.resolve_observed(&path)
    }

    fn observed_path(&self, peer_ip: IpAddr, headers: &HeaderMap) -> ObservedPath {
        let peer_ip = canonical_ip(peer_ip);
        let anchor = match &self.ingress.trusted_client_ip_header {
            Some(header) => match header_ip(headers, header) {
                Some(anchor) => anchor,
                // A configured ingress header is part of the trust boundary.
                // If it is absent or malformed, do not consult forwarding
                // headers supplied by the request.
                None => return ObservedPath::direct(peer_ip),
            },
            None => peer_ip,
        };
        let Some(mut hops) = x_forwarded_for(headers) else {
            return ObservedPath::direct(anchor);
        };
        if hops.len() < self.ingress.forwarded_suffix_hops {
            return ObservedPath::direct(anchor);
        }
        hops.truncate(hops.len() - self.ingress.forwarded_suffix_hops);
        if hops.last() != Some(&anchor) {
            hops.push(anchor);
        }
        if hops.len() > MAX_FORWARDED_HOPS {
            return ObservedPath::direct(anchor);
        }
        ObservedPath { hops }
    }

    fn resolve_observed(&self, path: &ObservedPath) -> IpAddr {
        let anchor = path.anchor();
        // Forwarding headers cannot affect a request whose nearest known hop is
        // not trusted. This is the important direct-connection case.
        if !self.is_trusted(anchor) {
            return anchor;
        }

        let mut current = anchor;
        for candidate in path.hops.iter().rev().skip(1) {
            if !self.is_trusted(current) {
                break;
            }
            current = *candidate;
        }
        current
    }

    fn is_trusted(&self, ip: IpAddr) -> bool {
        self.trust.load().contains(ip)
    }

    fn replace_cdn_ranges(&self, provider: CdnProvider, networks: Vec<IpNet>) {
        let networks: Arc<[IpNet]> = networks.into();
        self.trust.rcu(|current| {
            let mut cdn_ranges = (*current.cdn_ranges).clone();
            cdn_ranges.insert(provider, networks.clone());
            Arc::new(TrustSnapshot {
                cdn_ranges: Arc::new(cdn_ranges),
                ..(**current).clone()
            })
        });
    }

    fn replace_probed_trust(&self, proxies: ProbedProxyAddresses) {
        let proxies = Arc::new(proxies);
        self.trust.rcu(|current| {
            Arc::new(TrustSnapshot {
                probed: proxies.clone(),
                ..(**current).clone()
            })
        });
    }

    async fn fetch_cdn_ranges(&self, provider: CdnProvider) -> anyhow::Result<Vec<IpNet>> {
        let networks = match provider {
            CdnProvider::Cloudflare => {
                let mut body = Vec::new();
                for url in CLOUDFLARE_PROXY_LIST_URLS {
                    let part =
                        fetch_limited(&self.http_client, url, MAX_PLAIN_PROXY_LIST_BYTES).await?;
                    if body.len().saturating_add(part.len()) > MAX_PLAIN_PROXY_LIST_BYTES {
                        anyhow::bail!(
                            "Cloudflare proxy list exceeds {MAX_PLAIN_PROXY_LIST_BYTES} bytes"
                        );
                    }
                    body.extend_from_slice(&part);
                    body.push(b'\n');
                }
                parse_proxy_list(std::str::from_utf8(&body)?)?
            }
            CdnProvider::Fastly => {
                let body = fetch_limited(
                    &self.http_client,
                    FASTLY_PROXY_LIST_URL,
                    MAX_PLAIN_PROXY_LIST_BYTES,
                )
                .await?;
                parse_fastly_proxy_list(&body)?
            }
            CdnProvider::CloudFront => {
                let body = fetch_limited(
                    &self.http_client,
                    CLOUDFRONT_PROXY_LIST_URL,
                    MAX_CLOUDFRONT_LIST_BYTES,
                )
                .await?;
                parse_cloudfront_proxy_list(&body)?
            }
        };

        // All three providers currently publish substantially more than this.
        // A low count usually means a partial or incompatible response, which
        // must not replace the last known-good trust set.
        if networks.len() < 10 {
            anyhow::bail!("{} proxy list contains too few networks", provider.name());
        }
        if !networks
            .iter()
            .any(|network| matches!(network, IpNet::V4(_)))
            || !networks
                .iter()
                .any(|network| matches!(network, IpNet::V6(_)))
        {
            anyhow::bail!(
                "{} proxy list must contain both IPv4 and IPv6 networks",
                provider.name()
            );
        }
        Ok(networks)
    }

    async fn refresh_cdn_ranges(&self, provider: CdnProvider) -> anyhow::Result<()> {
        let networks = self.fetch_cdn_ranges(provider).await?;
        let count = networks.len();
        self.replace_cdn_ranges(provider, networks);
        metrics::gauge!(
            "boluo_server_client_ip_published_trusted_proxies",
            "provider" => provider.name()
        )
        .set(count as f64);
        Ok(())
    }

    pub fn start_cdn_refresh(&self) {
        let providers = self
            .trust
            .load()
            .cdn_ranges
            .keys()
            .copied()
            .collect::<Vec<_>>();
        if providers.is_empty() {
            return;
        }
        let resolver = self.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(6 * 60 * 60));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        for provider in providers.iter().copied() {
                            if let Err(error) = resolver.refresh_cdn_ranges(provider).await {
                                tracing::warn!(
                                    event = "client_ip.cdn_refresh_failed",
                                    provider = provider.name(),
                                    error = %error,
                                    "Failed to refresh CDN proxy CIDRs"
                                );
                            }
                        }
                    }
                    _ = crate::shutdown::SHUTDOWN.notified() => break,
                }
            }
        });
    }

    fn probe_candidate(&self, observed: &ObservedPath) -> Option<IpNet> {
        let anchor = observed.anchor();
        // A direct path contains only its anchor. A reverse proxy adds at least
        // one upstream hop before that anchor. CDN and explicitly
        // configured proxies are already trusted through another source.
        if observed.upstream_of_anchor().is_none() || self.trust.load().contains_static(anchor) {
            return None;
        }
        Some(IpNet::from(anchor))
    }

    async fn probe_proxy(
        &self,
        signer: &crate::context::Signer,
        proxy_url: String,
    ) -> anyhow::Result<Option<IpNet>> {
        let claims = ProbeClaims {
            purpose: "proxy_probe".to_owned(),
            proxy_url: proxy_url.clone(),
            nonce: Uuid::new_v4(),
            expires_at: unix_timestamp() + PROXY_PROBE_LIFETIME.as_secs() as i64,
        };
        let token = encode_probe_token(signer, &claims)?;
        let endpoint = format!("{}{}", proxy_url.trim_end_matches('/'), PROXY_PROBE_PATH);
        let response = self
            .http_client
            .post(endpoint)
            .header(&PROXY_PROBE_HEADER, token)
            .send()
            .await?
            .error_for_status()?;
        let signature = response
            .headers()
            .get(&PROXY_PROBE_SIGNATURE_HEADER)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned)
            .ok_or_else(|| anyhow::anyhow!("proxy probe response is missing its signature"))?;
        let body = read_limited_body(response, PROXY_PROBE_RESPONSE_LIMIT).await?;
        verify_probe_body(signer, &body, &signature)?;
        let response: ProbeResponse = sonic_rs::from_slice(&body)?;
        if response.proxy_url != claims.proxy_url || response.nonce != claims.nonce {
            anyhow::bail!("proxy probe response does not match its request");
        }

        Ok(self.probe_candidate(&response.observed))
    }

    async fn refresh_proxy_probes(
        &self,
        pool: &PgPool,
        signer: &crate::context::Signer,
    ) -> anyhow::Result<()> {
        // Enabled proxy URLs are the source of truth. Each request returns to
        // this server through that URL, revealing the proxy's actual origin
        // address without assuming that DNS ingress and egress are identical.
        let urls = sqlx::query_scalar::<_, String>(
            r#"SELECT "url" FROM "proxies" WHERE "is_enabled" = TRUE"#,
        )
        .fetch_all(pool)
        .await?;

        let previous = self.trust.load_full().probed.clone();
        let resolved = stream::iter(urls.into_iter().map(|url| async move {
            let result = self.probe_proxy(signer, url.clone()).await;
            (url, result)
        }))
        .buffer_unordered(8)
        .collect::<Vec<_>>()
        .await;

        let mut addresses = HashMap::new();
        let now = Instant::now();
        for (url, result) in resolved {
            let observed = match result {
                Ok(network) => network,
                Err(error) => {
                    tracing::warn!(
                        event = "client_ip.proxy_probe_failed",
                        proxy_url = url,
                        error = %error,
                        "Failed to probe proxy; retaining its recently observed addresses"
                    );
                    None
                }
            };
            let retained =
                merge_probe_observation(previous.get(&url).map(Vec::as_slice), observed, now);
            if !retained.is_empty() {
                // Security model: an enabled proxy is trusted to supply its
                // forwarding chain. Client IP is only used for rate limits
                // and observability, never as an authentication or
                // authorization credential. We deliberately do not defend
                // against a proxy manipulating that chain merely to evade
                // rate limits.
                addresses.insert(url, retained);
            }
        }
        let count = addresses.values().map(Vec::len).sum::<usize>();
        self.replace_probed_trust(addresses);
        metrics::gauge!("boluo_server_client_ip_probed_trusted_addresses").set(count as f64);
        Ok(())
    }

    pub fn start_proxy_probe_refresh(&self, pool: PgPool, signer: crate::context::Signer) {
        let resolver = self.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        if let Err(error) = resolver.refresh_proxy_probes(&pool, &signer).await {
                            tracing::warn!(
                                event = "client_ip.proxy_refresh_failed",
                                error = %error,
                                "Failed to refresh trusted proxy probes"
                            );
                        }
                    }
                    _ = crate::shutdown::SHUTDOWN.notified() => break,
                }
            }
        });
    }
}

fn unix_timestamp() -> i64 {
    time::OffsetDateTime::now_utc().unix_timestamp()
}

fn encode_probe_token(
    signer: &crate::context::Signer,
    claims: &ProbeClaims,
) -> anyhow::Result<String> {
    let payload = URL_SAFE_NO_PAD.encode(sonic_rs::to_vec(claims)?);
    let signature = URL_SAFE_NO_PAD.encode(signer.sign(&payload).as_ref());
    Ok(format!("{payload}.{signature}"))
}

fn sign_probe_body(signer: &crate::context::Signer, body: &[u8]) -> anyhow::Result<String> {
    let body = std::str::from_utf8(body)?;
    Ok(URL_SAFE_NO_PAD.encode(signer.sign(body).as_ref()))
}

fn verify_probe_body(
    signer: &crate::context::Signer,
    body: &[u8],
    signature: &str,
) -> anyhow::Result<()> {
    signer.verify(std::str::from_utf8(body)?, signature)
}

fn decode_probe_token(signer: &crate::context::Signer, token: &str) -> anyhow::Result<ProbeClaims> {
    let (payload, signature) = token
        .split_once('.')
        .filter(|(_, signature)| !signature.contains('.'))
        .ok_or_else(|| anyhow::anyhow!("invalid proxy probe token format"))?;
    signer.verify(payload, signature)?;
    let claims: ProbeClaims = sonic_rs::from_slice(&URL_SAFE_NO_PAD.decode(payload)?)?;
    let now = unix_timestamp();
    if claims.purpose != "proxy_probe"
        || claims.expires_at < now
        || claims.expires_at > now + PROXY_PROBE_LIFETIME.as_secs() as i64
    {
        anyhow::bail!("invalid or expired proxy probe token");
    }
    Ok(claims)
}

pub fn handle_probe(
    ctx: &crate::context::AppContext,
    request: Request<hyper::body::Incoming>,
) -> Result<crate::interface::Response, crate::error::AppError> {
    let token = request
        .headers()
        .get(&PROXY_PROBE_HEADER)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| crate::error::AppError::NoPermission("Invalid proxy probe".to_owned()))?;
    let claims = decode_probe_token(ctx.signer(), token)
        .map_err(|_| crate::error::AppError::NoPermission("Invalid proxy probe".to_owned()))?;
    let observed = request
        .extensions()
        .get::<ObservedPath>()
        .cloned()
        .ok_or_else(|| {
            crate::error::AppError::Unexpected(anyhow::anyhow!("missing observed client path"))
        })?;
    let body = crate::interface::ResponseBytes::from_serializable(&ProbeResponse {
        proxy_url: claims.proxy_url,
        nonce: claims.nonce,
        observed,
    })
    .map_err(crate::error::AppError::Serialize)?;
    let signature =
        sign_probe_body(ctx.signer(), body.as_ref()).map_err(crate::error::AppError::Unexpected)?;
    Ok(hyper::Response::builder()
        .status(hyper::StatusCode::OK)
        .header(hyper::header::CONTENT_TYPE, "application/json")
        .header(hyper::header::CACHE_CONTROL, "no-store")
        .header(&PROXY_PROBE_SIGNATURE_HEADER, signature)
        .body(body)
        .expect("valid proxy probe response"))
}

fn canonical_ip(ip: IpAddr) -> IpAddr {
    match ip {
        IpAddr::V6(ip) => ip
            .to_ipv4_mapped()
            .map(IpAddr::V4)
            .unwrap_or(IpAddr::V6(ip)),
        ip => ip,
    }
}

pub fn parse_trusted_proxy(value: &str) -> Result<IpNet, String> {
    value.parse::<IpNet>().or_else(|network_error| {
        value
            .parse::<IpAddr>()
            .map(IpNet::from)
            .map_err(|_| format!("invalid proxy IP address or CIDR {value:?}: {network_error}"))
    })
}

fn header_ip(headers: &HeaderMap, name: &hyper::header::HeaderName) -> Option<IpAddr> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.trim().parse().ok())
        .map(canonical_ip)
}

fn x_forwarded_for(headers: &HeaderMap) -> Option<Vec<IpAddr>> {
    let mut addresses = Vec::new();
    for header in headers.get_all(&X_FORWARDED_FOR) {
        let header = header.to_str().ok()?;
        for value in header.split(',') {
            // Reject the complete chain on malformed or obfuscated entries. In
            // particular, never skip an entry and accidentally cross a trust
            // boundary.
            if addresses.len() == MAX_FORWARDED_HOPS {
                return None;
            }
            addresses.push(canonical_ip(value.trim().parse().ok()?));
        }
    }
    (!addresses.is_empty()).then_some(addresses)
}

async fn fetch_limited(
    client: &reqwest::Client,
    url: &str,
    limit: usize,
) -> anyhow::Result<Vec<u8>> {
    let response = client.get(url).send().await?.error_for_status()?;
    read_limited_body(response, limit)
        .await
        .with_context(|| format!("failed to read proxy list from {url}"))
}

async fn read_limited_body(
    mut response: reqwest::Response,
    limit: usize,
) -> anyhow::Result<Vec<u8>> {
    if response
        .content_length()
        .is_some_and(|length| length > limit as u64)
    {
        anyhow::bail!("HTTP response body exceeds {limit} bytes");
    }

    let mut body = Vec::new();
    while let Some(chunk) = response.chunk().await? {
        if body.len().saturating_add(chunk.len()) > limit {
            anyhow::bail!("HTTP response body exceeds {limit} bytes");
        }
        body.extend_from_slice(&chunk);
    }
    Ok(body)
}

#[derive(Deserialize)]
struct FastlyProxyList {
    addresses: Vec<String>,
    ipv6_addresses: Vec<String>,
}

fn parse_fastly_proxy_list(body: &[u8]) -> anyhow::Result<Vec<IpNet>> {
    let list: FastlyProxyList = sonic_rs::from_slice(body)?;
    parse_proxy_values(list.addresses.into_iter().chain(list.ipv6_addresses))
}

#[derive(Deserialize)]
struct AwsIpv4Prefix {
    ip_prefix: String,
    service: String,
}

#[derive(Deserialize)]
struct AwsIpv6Prefix {
    ipv6_prefix: String,
    service: String,
}

#[derive(Deserialize)]
struct AwsIpRanges {
    prefixes: Vec<AwsIpv4Prefix>,
    ipv6_prefixes: Vec<AwsIpv6Prefix>,
}

fn parse_cloudfront_proxy_list(body: &[u8]) -> anyhow::Result<Vec<IpNet>> {
    let list: AwsIpRanges = sonic_rs::from_slice(body)?;
    // Trust viewer-facing edge ranges as well as the narrower origin-facing
    // set. Keep regional entries too: regional edge caches can contact a custom
    // origin, not only entries whose region is GLOBAL.
    parse_proxy_values(
        list.prefixes
            .into_iter()
            .filter(|prefix| is_cloudfront_service(&prefix.service))
            .map(|prefix| prefix.ip_prefix)
            .chain(
                list.ipv6_prefixes
                    .into_iter()
                    .filter(|prefix| is_cloudfront_service(&prefix.service))
                    .map(|prefix| prefix.ipv6_prefix),
            ),
    )
}

fn is_cloudfront_service(service: &str) -> bool {
    matches!(service, "CLOUDFRONT" | "CLOUDFRONT_ORIGIN_FACING")
}

fn parse_proxy_values(values: impl IntoIterator<Item = String>) -> anyhow::Result<Vec<IpNet>> {
    let mut networks = values
        .into_iter()
        .map(|value| value.parse())
        .collect::<Result<Vec<IpNet>, _>>()?;
    networks.sort_unstable();
    networks.dedup();
    Ok(networks)
}

fn parse_proxy_list(body: &str) -> anyhow::Result<Vec<IpNet>> {
    parse_proxy_values(
        body.lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .map(str::to_owned),
    )
}

#[cfg(test)]
mod tests {
    use std::net::Ipv6Addr;

    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    use super::*;

    fn resolver_with_cdns(networks: &[&str], cdn_providers: &[CdnProvider], fly: bool) -> Resolver {
        let ingress = if fly {
            Ingress::trusted_header(hyper::header::HeaderName::from_static("fly-client-ip"), 1)
        } else {
            Ingress::bare_metal()
        };
        Resolver::new(
            networks
                .iter()
                .map(|network| network.parse().unwrap())
                .collect(),
            cdn_providers,
            ingress,
        )
    }

    fn resolver(networks: &[&str], fly: bool) -> Resolver {
        resolver_with_cdns(networks, &[], fly)
    }

    fn headers(values: &[(&str, &str)]) -> HeaderMap {
        let mut headers = HeaderMap::new();
        for (name, value) in values {
            headers.insert(
                hyper::header::HeaderName::from_bytes(name.as_bytes()).unwrap(),
                value.parse().unwrap(),
            );
        }
        headers
    }

    #[test]
    fn direct_connection_ignores_spoofed_forwarding_headers() {
        let resolver = resolver(&[], false);
        let headers = headers(&[("x-forwarded-for", "198.51.100.1")]);

        assert_eq!(
            resolver.resolve("203.0.113.10".parse().unwrap(), &headers),
            "203.0.113.10".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn strips_trusted_proxies_from_the_right() {
        let resolver = resolver(&["10.0.0.0/8", "192.0.2.0/24"], false);
        let headers = headers(&[("x-forwarded-for", "198.51.100.7, 192.0.2.20, 192.0.2.21")]);

        assert_eq!(
            resolver.resolve("10.0.0.5".parse().unwrap(), &headers),
            "198.51.100.7".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn stops_at_the_first_untrusted_address() {
        let resolver = resolver(&["10.0.0.0/8"], false);
        let headers = headers(&[("x-forwarded-for", "198.51.100.1, 203.0.113.8, 10.1.1.1")]);

        assert_eq!(
            resolver.resolve("10.0.0.5".parse().unwrap(), &headers),
            "203.0.113.8".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn malformed_chain_falls_back_to_the_trusted_anchor() {
        let resolver = resolver(&["10.0.0.0/8"], false);
        let headers = headers(&[("x-forwarded-for", "198.51.100.1, unknown")]);

        assert_eq!(
            resolver.resolve("10.0.0.5".parse().unwrap(), &headers),
            "10.0.0.5".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn oversized_chain_falls_back_to_the_trusted_anchor() {
        let resolver = resolver(&["10.0.0.0/8"], false);
        let forwarded = std::iter::repeat_n("198.51.100.1", MAX_FORWARDED_HOPS + 1)
            .collect::<Vec<_>>()
            .join(", ");
        let headers = headers(&[("x-forwarded-for", &forwarded)]);

        assert_eq!(
            resolver.resolve("10.0.0.5".parse().unwrap(), &headers),
            "10.0.0.5".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn fly_direct_connection_uses_fly_client_ip() {
        let resolver = resolver(&["162.158.0.0/15"], true);
        let headers = headers(&[
            ("fly-client-ip", "203.0.113.10"),
            ("x-forwarded-for", "198.51.100.1, 203.0.113.10"),
        ]);

        assert_eq!(
            resolver.resolve("172.16.0.2".parse().unwrap(), &headers),
            "203.0.113.10".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn fly_connection_peels_a_trusted_cloudflare_proxy() {
        let resolver = resolver_with_cdns(&[], &[CdnProvider::Cloudflare], true);
        let headers = headers(&[
            ("fly-client-ip", "162.159.110.62"),
            (
                "x-forwarded-for",
                "240d:1a:61d:5b00::1, 162.159.110.62, 213.188.203.68",
            ),
        ]);

        assert_eq!(
            resolver.resolve("172.16.0.2".parse().unwrap(), &headers),
            "240d:1a:61d:5b00::1".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn fly_connection_peels_a_trusted_self_hosted_proxy() {
        let resolver = resolver(&["154.12.191.152/32"], true);
        let headers = headers(&[
            ("fly-client-ip", "154.12.191.152"),
            (
                "x-forwarded-for",
                "198.51.100.1, 203.0.113.10, 154.12.191.152, 213.188.203.68",
            ),
        ]);

        assert_eq!(
            resolver.resolve("172.16.0.2".parse().unwrap(), &headers),
            "203.0.113.10".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn fly_connection_does_not_trust_xff_from_a_direct_client() {
        let resolver = resolver(&["162.158.0.0/15"], true);
        let headers = headers(&[
            ("fly-client-ip", "203.0.113.10"),
            ("x-forwarded-for", "198.51.100.1, 203.0.113.10"),
        ]);

        assert_eq!(
            resolver.resolve("172.16.0.2".parse().unwrap(), &headers),
            "203.0.113.10".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn configured_ingress_header_is_required() {
        let resolver = resolver(&["10.0.0.0/8"], true);
        let headers = headers(&[("x-forwarded-for", "198.51.100.1, 203.0.113.8")]);

        assert_eq!(
            resolver.resolve("10.0.0.5".parse().unwrap(), &headers),
            "10.0.0.5".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn canonicalizes_ipv4_mapped_peer_addresses() {
        let resolver = resolver(&[], false);
        let headers = HeaderMap::new();

        assert_eq!(
            resolver.resolve(IpAddr::V6(Ipv6Addr::from_bits(0xffff_c000_0201)), &headers),
            "192.0.2.1".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn parses_cloudflare_style_proxy_lists() {
        let networks = parse_proxy_list("173.245.48.0/20\n\n2606:4700::/32\n").unwrap();

        assert_eq!(networks.len(), 2);
        assert!(
            networks
                .iter()
                .any(|network| matches!(network, IpNet::V4(_)))
        );
        assert!(
            networks
                .iter()
                .any(|network| matches!(network, IpNet::V6(_)))
        );
        assert!(parse_proxy_list("173.245.48.0/20\ninvalid\n").is_err());
    }

    #[test]
    fn parses_trusted_proxy_ips_and_cidrs() {
        assert_eq!(
            parse_trusted_proxy("192.0.2.10").unwrap(),
            "192.0.2.10/32".parse().unwrap()
        );
        assert_eq!(
            parse_trusted_proxy("2001:db8::10").unwrap(),
            "2001:db8::10/128".parse().unwrap()
        );
        assert_eq!(
            parse_trusted_proxy("10.0.0.0/8").unwrap(),
            "10.0.0.0/8".parse().unwrap()
        );
        assert!(parse_trusted_proxy("not-an-ip").is_err());
    }

    #[test]
    fn parses_fastly_and_cloudfront_proxy_lists() {
        let fastly = parse_fastly_proxy_list(
            br#"{"addresses":["151.101.0.0/16"],"ipv6_addresses":["2a04:4e40::/32"]}"#,
        )
        .unwrap();
        assert_eq!(fastly.len(), 2);

        let cloudfront = parse_cloudfront_proxy_list(
            br#"{
                "prefixes":[
                    {"ip_prefix":"18.64.0.0/14","service":"CLOUDFRONT"},
                    {"ip_prefix":"3.172.64.0/18","service":"CLOUDFRONT_ORIGIN_FACING"},
                    {"ip_prefix":"3.5.140.0/22","service":"AMAZON"}
                ],
                "ipv6_prefixes":[
                    {"ipv6_prefix":"2600:9000:1000::/36","service":"CLOUDFRONT"}
                ]
            }"#,
        )
        .unwrap();
        assert_eq!(cloudfront.len(), 3);
    }

    #[test]
    fn embedded_cdn_lists_are_dual_stack_and_require_opt_in() {
        for body in [
            DEFAULT_CLOUDFLARE_PROXY_LIST,
            DEFAULT_FASTLY_PROXY_LIST,
            DEFAULT_CLOUDFRONT_PROXY_LIST,
        ] {
            let networks = parse_proxy_list(body).unwrap();
            assert!(networks.len() >= 10);
            assert!(
                networks
                    .iter()
                    .any(|network| matches!(network, IpNet::V4(_)))
            );
            assert!(
                networks
                    .iter()
                    .any(|network| matches!(network, IpNet::V6(_)))
            );
        }

        let resolver = resolver(&[], false);
        assert!(!resolver.is_trusted("172.64.215.174".parse().unwrap()));
        assert!(!resolver.is_trusted("151.101.1.1".parse().unwrap()));
        assert!(!resolver.is_trusted("18.64.0.1".parse().unwrap()));

        let resolver = resolver_with_cdns(
            &[],
            &[
                CdnProvider::Cloudflare,
                CdnProvider::Fastly,
                CdnProvider::CloudFront,
            ],
            false,
        );
        assert!(resolver.is_trusted("172.64.215.174".parse().unwrap()));
        assert!(resolver.is_trusted("2606:4700::1".parse().unwrap()));
        assert!(resolver.is_trusted("151.101.1.1".parse().unwrap()));
        assert!(resolver.is_trusted("2a04:4e40::1".parse().unwrap()));
        assert!(resolver.is_trusted("18.64.0.1".parse().unwrap()));
        assert!(resolver.is_trusted("2600:9000:1000::1".parse().unwrap()));
    }

    #[test]
    fn trust_snapshot_updates_preserve_other_sources() {
        let resolver = resolver(&["10.0.0.0/8"], false);
        resolver.replace_cdn_ranges(
            CdnProvider::Cloudflare,
            vec!["192.0.2.0/24".parse().unwrap()],
        );
        resolver.replace_probed_trust(HashMap::from([(
            "https://proxy.example".to_owned(),
            vec![ProbedAddress {
                network: "198.51.100.10/32".parse().unwrap(),
                observed_at: Instant::now(),
            }],
        )]));

        assert!(resolver.is_trusted("10.1.1.1".parse().unwrap()));
        assert!(resolver.is_trusted("192.0.2.20".parse().unwrap()));
        assert!(resolver.is_trusted("198.51.100.10".parse().unwrap()));
    }

    #[test]
    fn probe_observations_retain_multiple_recent_addresses() {
        let now = Instant::now();
        let first = "192.0.2.10/32".parse().unwrap();
        let second = "198.51.100.20/32".parse().unwrap();
        let addresses = merge_probe_observation(None, Some(first), now);
        let later = now + Duration::from_secs(60);
        let addresses = merge_probe_observation(Some(&addresses), Some(second), later);

        assert_eq!(addresses.len(), 2);
        assert!(addresses.iter().any(|address| address.network == first));
        assert!(addresses.iter().any(|address| address.network == second));

        let expired = merge_probe_observation(
            Some(&addresses),
            None,
            later + PROXY_PROBE_STALE_AFTER + Duration::from_secs(1),
        );
        assert!(expired.is_empty());
    }

    #[test]
    fn probe_observations_have_a_per_proxy_limit() {
        let now = Instant::now();
        let mut addresses = Vec::new();
        for octet in 1..=(MAX_PROBED_ADDRESSES_PER_PROXY + 1) {
            let network = format!("192.0.2.{octet}/32").parse().unwrap();
            addresses = merge_probe_observation(
                Some(&addresses),
                Some(network),
                now + Duration::from_secs(octet as u64),
            );
        }

        assert_eq!(addresses.len(), MAX_PROBED_ADDRESSES_PER_PROXY);
        assert!(
            !addresses
                .iter()
                .any(|address| address.network == "192.0.2.1/32".parse().unwrap())
        );
    }

    #[test]
    fn probe_discovers_only_an_additional_reverse_proxy() {
        let resolver = resolver(&["162.158.0.0/15"], true);
        let self_hosted = ObservedPath {
            hops: vec![
                "203.0.113.8".parse().unwrap(),
                "192.0.2.10".parse().unwrap(),
            ],
        };
        assert_eq!(
            resolver.probe_candidate(&self_hosted),
            Some("192.0.2.10/32".parse().unwrap())
        );

        let direct = ObservedPath {
            hops: vec!["203.0.113.8".parse().unwrap()],
        };
        assert_eq!(resolver.probe_candidate(&direct), None);

        let cloudflare = ObservedPath {
            hops: vec![
                "198.51.100.5".parse().unwrap(),
                "162.159.110.62".parse().unwrap(),
            ],
        };
        assert_eq!(resolver.probe_candidate(&cloudflare), None);
    }

    #[test]
    fn fly_probe_discovers_proxy_from_normalized_path() {
        let resolver = resolver(&[], true);
        let proxy_headers = headers(&[
            ("fly-client-ip", "192.0.2.10"),
            ("x-forwarded-for", "203.0.113.8, 192.0.2.10, 198.51.100.20"),
        ]);
        let proxy_path = resolver.observed_path("172.16.0.2".parse().unwrap(), &proxy_headers);
        assert_eq!(
            resolver.probe_candidate(&proxy_path),
            Some("192.0.2.10/32".parse().unwrap())
        );

        let direct_headers = headers(&[
            ("fly-client-ip", "203.0.113.8"),
            ("x-forwarded-for", "203.0.113.8, 198.51.100.20"),
        ]);
        let direct_path = resolver.observed_path("172.16.0.2".parse().unwrap(), &direct_headers);
        assert_eq!(resolver.probe_candidate(&direct_path), None);
    }

    #[test]
    fn direct_self_probe_does_not_discover_proxy() {
        let resolver = resolver(&[], false);
        let path = resolver.observed_path("203.0.113.8".parse().unwrap(), &HeaderMap::new());

        assert_eq!(path.hops, vec!["203.0.113.8".parse::<IpAddr>().unwrap()]);
        assert_eq!(resolver.probe_candidate(&path), None);
    }

    #[test]
    fn probe_response_rejects_invalid_observed_paths() {
        assert!(sonic_rs::from_str::<ObservedPath>(r#"{"hops":[]}"#).is_err());

        let oversized = ObservedPath {
            hops: vec!["203.0.113.8".parse().unwrap(); MAX_FORWARDED_HOPS + 1],
        };
        let oversized = sonic_rs::to_string(&oversized).unwrap();
        assert!(sonic_rs::from_str::<ObservedPath>(&oversized).is_err());
    }

    #[test]
    fn proxy_probe_tokens_are_signed_and_expire() {
        let signer = crate::context::Signer::new("probe test");
        let claims = ProbeClaims {
            purpose: "proxy_probe".to_owned(),
            proxy_url: "https://proxy.example".to_owned(),
            nonce: Uuid::new_v4(),
            expires_at: unix_timestamp() + 10,
        };
        let token = encode_probe_token(&signer, &claims).unwrap();
        let decoded = decode_probe_token(&signer, &token).unwrap();
        assert_eq!(decoded.proxy_url, claims.proxy_url);
        assert_eq!(decoded.nonce, claims.nonce);

        let mut tampered = token;
        tampered.push('x');
        assert!(decode_probe_token(&signer, &tampered).is_err());

        let expired = ProbeClaims {
            expires_at: unix_timestamp() - 1,
            ..claims
        };
        let expired = encode_probe_token(&signer, &expired).unwrap();
        assert!(decode_probe_token(&signer, &expired).is_err());
    }

    #[test]
    fn proxy_probe_response_signature_authenticates_body() {
        let signer = crate::context::Signer::new("probe response test");
        let body = br#"{"proxy_url":"https://proxy.example"}"#;
        let signature = sign_probe_body(&signer, body).unwrap();

        assert!(verify_probe_body(&signer, body, &signature).is_ok());
        assert!(
            verify_probe_body(
                &signer,
                br#"{"proxy_url":"https://other.example"}"#,
                &signature
            )
            .is_err()
        );
        assert!(verify_probe_body(&signer, body, "invalid").is_err());
    }

    async fn spawn_probe_server(signer: crate::context::Signer) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut request = Vec::new();
            loop {
                let mut chunk = [0; 1024];
                let read = stream.read(&mut chunk).await.unwrap();
                assert!(read > 0);
                request.extend_from_slice(&chunk[..read]);
                if request.windows(4).any(|window| window == b"\r\n\r\n") {
                    break;
                }
            }
            let request = String::from_utf8(request).unwrap();
            let token = request
                .lines()
                .find_map(|line| {
                    let (name, value) = line.split_once(':')?;
                    name.eq_ignore_ascii_case(PROXY_PROBE_HEADER.as_str())
                        .then(|| value.trim())
                })
                .unwrap();
            let claims = decode_probe_token(&signer, token).unwrap();
            let body = sonic_rs::to_vec(&ProbeResponse {
                proxy_url: claims.proxy_url,
                nonce: claims.nonce,
                observed: ObservedPath {
                    hops: vec![
                        "203.0.113.8".parse().unwrap(),
                        "192.0.2.10".parse().unwrap(),
                    ],
                },
            })
            .unwrap();
            let signature = sign_probe_body(&signer, &body).unwrap();
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n{}: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                PROXY_PROBE_SIGNATURE_HEADER.as_str(),
                signature,
                body.len(),
            );
            stream.write_all(response.as_bytes()).await.unwrap();
            stream.write_all(&body).await.unwrap();
        });
        url
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_probes_enabled_proxy_urls(pool: PgPool) {
        let signer = crate::context::Signer::new("probe test");
        let enabled_url = spawn_probe_server(signer.clone()).await;
        sqlx::query(
            r#"INSERT INTO proxies (name, url)
               VALUES ('enabled', $1),
                      ('disabled', 'http://127.0.0.1:1')"#,
        )
        .bind(enabled_url)
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query(r#"UPDATE proxies SET is_enabled = FALSE WHERE name = 'disabled'"#)
            .execute(&pool)
            .await
            .unwrap();

        let resolver = resolver(&[], false);
        resolver.refresh_proxy_probes(&pool, &signer).await.unwrap();
        let headers = headers(&[("x-forwarded-for", "203.0.113.8")]);

        assert_eq!(
            resolver.resolve("192.0.2.10".parse().unwrap(), &headers),
            "203.0.113.8".parse::<IpAddr>().unwrap()
        );
        assert_eq!(
            resolver.resolve("198.51.100.10".parse().unwrap(), &headers),
            "198.51.100.10".parse::<IpAddr>().unwrap()
        );
    }
}
