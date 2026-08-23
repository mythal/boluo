use std::sync::Arc;

/// Build an HTTP client with a reproducible Mozilla root store instead of
/// depending on CA certificates installed by the host environment.
pub fn builder() -> reqwest::ClientBuilder {
    let root_store =
        rustls::RootCertStore::from_iter(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let provider = Arc::new(rustls::crypto::aws_lc_rs::default_provider());
    let tls_config = rustls::ClientConfig::builder_with_provider(provider)
        .with_safe_default_protocol_versions()
        .expect("AWS-LC supports rustls default protocol versions")
        .with_root_certificates(root_store)
        .with_no_client_auth();

    reqwest::Client::builder().tls_backend_preconfigured(tls_config)
}
