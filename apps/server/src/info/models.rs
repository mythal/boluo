use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::db;

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Proxy {
    pub name: String,
    pub url: String,
    pub region: String,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub available: u64,
    pub total: u64,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct HealthCheck {
    pub timestamp_sec: u64,
    pub disks: Vec<DiskInfo>,
    pub memory_total: u64,
    pub memory_used: u64,
    pub cache: CheckResult<ConnectionState>,
    pub database: CheckResult<ConnectionState>,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
#[serde(tag = "type")]
pub enum CheckResult<T> {
    Ok { value: T },
    Error { message: String },
}

impl<T> From<Result<T, String>> for CheckResult<T>
where
    T: Serialize + Clone + TS + std::fmt::Debug,
{
    fn from(result: Result<T, String>) -> Self {
        match result {
            Ok(ok) => CheckResult::Ok { value: ok },
            Err(err) => CheckResult::Error { message: err },
        }
    }
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct ConnectionState {
    rtt_ms: u64,
    /// Connection count in the pool.
    ///
    /// Always 1 if the connection is not pooled.
    count: usize,
}

impl ConnectionState {
    pub async fn cache() -> Result<ConnectionState, String> {
        pub use redis::AsyncCommands;
        let start = std::time::Instant::now();
        let mut conn = crate::cache::conn()
            .await
            .map_err(|err| format!("Failed to connect to cache: {:?}", err))?;
        let _redis_result: bool = conn
            .inner
            .set(b"health_check", b"ok")
            .await
            .map_err(|err| format!("Failed to set health_check to cache: {:?}", err))?;
        let rtt_ms = start.elapsed().as_millis() as u64;
        Ok(ConnectionState { rtt_ms, count: 1 })
    }

    pub async fn database() -> Result<ConnectionState, String> {
        let start = std::time::Instant::now();
        let pool = db::get().await;
        let count = pool.size() as usize;
        sqlx::query!("SELECT 1 as x;")
            .fetch_one(&pool)
            .await
            .map_err(|err| format!("Failed to query database: {:?}", err))?;
        let rtt_ms = start.elapsed().as_millis() as u64;
        Ok(ConnectionState { rtt_ms, count })
    }
}

impl HealthCheck {
    pub async fn new() -> HealthCheck {
        use sysinfo::{Disks, System};
        let mut system = System::new();
        let cache = ConnectionState::cache().await.into();
        let database = ConnectionState::database().await.into();
        system.refresh_memory();
        let disks = Disks::new_with_refreshed_list();
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
                .collect(),
            memory_total: system.total_memory(),
            memory_used: system.used_memory(),
            cache,
            database,
        }
    }
}
