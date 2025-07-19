use serde::{Deserialize, Serialize};

use crate::db;

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Proxy {
    pub name: String,
    pub url: String,
    pub region: String,
}

#[derive(Debug, Serialize, Clone, specta::Type)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub available: u64,
    pub total: u64,
}

#[derive(Debug, Serialize, Clone, specta::Type)]
pub struct HealthCheck {
    pub timestamp_sec: u64,
    pub disks: Vec<DiskInfo>,
    pub memory_total: u64,
    pub memory_used: u64,
    pub cache: CheckResult<ConnectionState>,
    pub redis: CheckResult<ConnectionState>,
    pub database: CheckResult<ConnectionState>,
}

#[derive(Debug, Serialize, Clone, specta::Type)]
#[serde(tag = "type")]
pub enum CheckResult<T> {
    Ok { value: T },
    Error { message: String },
}

impl<T> From<Result<T, String>> for CheckResult<T>
where
    T: Serialize + Clone + specta::Type + std::fmt::Debug,
{
    fn from(result: Result<T, String>) -> Self {
        match result {
            Ok(ok) => CheckResult::Ok { value: ok },
            Err(err) => CheckResult::Error { message: err },
        }
    }
}

#[derive(Debug, Serialize, Clone, specta::Type)]
pub struct ConnectionState {
    rtt_ms: u64,
    /// Connection count in the pool.
    ///
    /// Always 1 if the connection is not pooled.
    count: usize,
    idle: usize,
}

impl ConnectionState {
    pub async fn database() -> Result<ConnectionState, String> {
        let start = std::time::Instant::now();
        let pool = db::get().await;
        let count = pool.size() as usize;
        let idle = pool.num_idle();

        {
            let mut conn: sqlx::pool::PoolConnection<sqlx::Postgres> = pool
                .acquire()
                .await
                .map_err(|err| format!("Failed to acquire connection: {err:?}"))?;
            let record = sqlx::query!("SELECT 42 as x;")
                .fetch_one(&mut *conn)
                .await
                .map_err(|err| format!("Failed to query database: {err:?}"))?;
            if record.x != Some(42) {
                return Err("Database query failed".to_string());
            }
        }
        let rtt_ms = start.elapsed().as_millis() as u64;
        Ok(ConnectionState {
            rtt_ms,
            count,
            idle,
        })
    }

    pub async fn redis() -> Result<ConnectionState, String> {
        use redis::AsyncCommands as _;
        let start = std::time::Instant::now();
        let mut conn = crate::redis::conn().await.ok_or("Redis is disabled")?;
        let count = 1;
        let idle = 0;
        let _: Result<(), String> = conn
            .set("madoka", "homura")
            .await
            .map_err(|e| e.to_string());
        let rtt_ms = start.elapsed().as_millis() as u64;
        Ok(ConnectionState {
            rtt_ms,
            count,
            idle,
        })
    }
}

impl HealthCheck {
    pub async fn new() -> HealthCheck {
        use sysinfo::{Disks, System};
        let mut system = System::new();
        let cache = CheckResult::Ok {
            value: ConnectionState {
                rtt_ms: 0,
                count: 1,
                idle: 0,
            },
        };
        let redis = ConnectionState::redis().await.into();
        let database = ConnectionState::database().await.into();
        system.refresh_memory();
        let disks = Disks::new_with_refreshed_list();
        let gib_in_bytes = 1024 * 1024 * 1024;
        HealthCheck {
            timestamp_sec: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|x| x.as_secs())
                .unwrap_or(0),
            disks: disks
                .iter()
                .map(|disk| DiskInfo {
                    name: disk.name().to_string_lossy().to_string(),
                    mount_point: disk.mount_point().to_string_lossy().to_string(),
                    available: disk.available_space(),
                    total: disk.total_space(),
                })
                .filter(|disk| disk.total > gib_in_bytes)
                .collect(),
            memory_total: system.total_memory(),
            memory_used: system.used_memory(),
            cache,
            redis,
            database,
        }
    }
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
