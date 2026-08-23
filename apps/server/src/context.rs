use crate::error::AppError;
use ring::hmac;
use std::sync::Arc;

#[derive(Clone)]
pub struct Signer(Arc<hmac::Key>);

impl Signer {
    pub(crate) fn new(secret: &str) -> Self {
        use ring::digest;

        let digest = digest::digest(&digest::SHA256, secret.as_bytes());
        Self(Arc::new(hmac::Key::new(hmac::HMAC_SHA256, digest.as_ref())))
    }

    pub fn sign(&self, message: &str) -> hmac::Tag {
        hmac::sign(&self.0, message.as_bytes())
    }

    pub fn verify(&self, message: &str, signature: &str) -> Result<(), anyhow::Error> {
        use anyhow::Context;
        use base64::{Engine as _, engine::general_purpose};

        let signature = signature.trim();
        let signature = general_purpose::URL_SAFE_NO_PAD
            .decode(signature)
            .or_else(|_| general_purpose::URL_SAFE.decode(signature))
            .or_else(|_| general_purpose::STANDARD_NO_PAD.decode(signature))
            .or_else(|_| general_purpose::STANDARD.decode(signature))
            .context("Failed to decode signature")?;
        hmac::verify(&self.0, message.as_bytes(), &signature)
            .map_err(|_| anyhow::anyhow!("Failed to verify message signature"))
    }
}

#[derive(Clone)]
pub struct AppConfig {
    pub ci: bool,
    pub debug: bool,
    pub public_media_url: Option<String>,
    pub app_url: Option<String>,
    pub site_url: Option<String>,
    pub sentry_dsn: Option<String>,
    pub sentry_host: String,
    pub sentry_project_ids: Vec<String>,
    pub discourse_sso_secret: Option<String>,
    pub secret: String,
    pub mail: crate::mail::Config,
    pub entry_component_cache_capacity: u64,
}

#[cfg(test)]
impl Default for AppConfig {
    fn default() -> Self {
        Self {
            ci: false,
            debug: false,
            public_media_url: None,
            app_url: None,
            site_url: None,
            sentry_dsn: None,
            sentry_host: String::new(),
            sentry_project_ids: Vec::new(),
            discourse_sso_secret: None,
            secret: "just a test".to_owned(),
            mail: crate::mail::Config::default(),
            entry_component_cache_capacity: crate::entries::component_cache::DEFAULT_CACHE_BYTES,
        }
    }
}

pub(crate) struct SpaceList {
    pub(crate) spaces: Vec<crate::spaces::Space>,
    pub(crate) instant: std::time::Instant,
}

pub(crate) type SpaceListCache = tokio::sync::OnceCell<arc_swap::ArcSwap<SpaceList>>;

/// Shared application context that holds commonly used resources
#[derive(Clone)]
pub struct AppContext {
    /// Database connection pool
    pub db: sqlx::Pool<sqlx::Postgres>,
    /// Redis connection (optional)
    pub redis: Option<redis::aio::ConnectionManager>,
    /// Lazily loaded, node-local Space runtimes.
    pub(crate) space_store: crate::space_runtime::SpaceStore,
    pub(crate) space_activity_notifier: crate::notify::SpaceActivityNotifier,
    pub(crate) space_list_cache: Arc<SpaceListCache>,
    pub(crate) storage: Arc<crate::s3::Storage>,
    pub(crate) signer: Signer,
    pub config: AppConfig,
}

impl AppContext {
    /// Create a new AppContext with the given database pool and redis connection
    #[cfg(test)]
    pub fn new(
        db: sqlx::Pool<sqlx::Postgres>,
        redis: Option<redis::aio::ConnectionManager>,
    ) -> Self {
        Self::with_config(
            db,
            redis,
            AppConfig::default(),
            Arc::new(crate::s3::Storage::disabled()),
        )
    }

    pub fn with_config(
        db: sqlx::Pool<sqlx::Postgres>,
        redis: Option<redis::aio::ConnectionManager>,
        config: AppConfig,
        storage: Arc<crate::s3::Storage>,
    ) -> Self {
        let signer = Signer::new(&config.secret);
        let space_store = crate::space_runtime::SpaceStore::with_entry_component_cache_capacity(
            db.clone(),
            config.entry_component_cache_capacity,
        );
        let space_activity_notifier = crate::notify::SpaceActivityNotifier::new(db.clone());
        Self {
            db,
            redis,
            space_store,
            space_activity_notifier,
            space_list_cache: Arc::new(tokio::sync::OnceCell::const_new()),
            storage,
            signer,
            config,
        }
    }

    pub fn ci(&self) -> bool {
        self.config.ci
    }

    pub fn debug(&self) -> bool {
        self.config.debug
    }

    pub fn media_public_url(&self) -> &str {
        self.config
            .public_media_url
            .as_deref()
            .unwrap_or_default()
            .trim_end_matches('/')
    }

    pub fn get_site_url(&self) -> Result<&str, AppError> {
        self.config
            .site_url
            .as_deref()
            .ok_or(AppError::Unexpected(anyhow::anyhow!("site_url not set")))
    }

    pub fn secret(&self) -> &str {
        &self.config.secret
    }

    pub(crate) fn signer(&self) -> &Signer {
        &self.signer
    }

    pub(crate) fn storage(&self) -> &crate::s3::Storage {
        &self.storage
    }
}
