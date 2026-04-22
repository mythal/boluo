use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Proxy {
    pub name: String,
    pub url: String,
    pub region: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct BasicInfo {
    pub version: String,
}

impl BasicInfo {
    pub fn new() -> Self {
        static VERSION: std::sync::LazyLock<String> = std::sync::LazyLock::new(|| {
            std::env::var("APP_VERSION").unwrap_or_else(|_| "unknown".to_string())
        });
        let version = VERSION.clone();
        BasicInfo { version }
    }
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub media_url: Option<String>,
    #[serde(default)]
    pub app_url: Option<String>,
    #[serde(default)]
    pub site_url: Option<String>,
    #[serde(default)]
    pub sentry_dsn: Option<String>,
}

impl AppSettings {
    pub fn new() -> Self {
        let media_url = crate::context::PUBLIC_MEDIA_URL.clone();
        let app_url = crate::context::APP_URL.clone();
        let site_url = crate::context::SITE_URL.clone();
        let sentry_dsn = crate::context::SENTRY_DSN.clone();
        AppSettings {
            media_url,
            app_url,
            site_url,
            sentry_dsn,
        }
    }
}
