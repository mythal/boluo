use std::collections::BTreeMap;
use std::path::PathBuf;

use compact_str::CompactString;
use foyer::{
    BlockEngineConfig, CacheBuilder, Compression, DeviceBuilder, FsDeviceBuilder, HybridCache,
    HybridCacheBuilder, HybridCachePolicy, PsyncIoEngineConfig, RecoverMode, Source,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::models::{EntryComponent, EntryComponentsSnapshot};

pub(crate) const DEFAULT_MEMORY_CACHE_BYTES: usize = 16 * 1024 * 1024;
pub(crate) const DEFAULT_DISK_CACHE_BYTES: usize = 512 * 1024 * 1024;

#[derive(Debug, Clone)]
pub(crate) struct HybridCacheConfig {
    pub(crate) memory_capacity: usize,
    pub(crate) disk_capacity: usize,
    pub(crate) disk_path: PathBuf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
struct CacheKey {
    entry_id: Uuid,
    components_version: Uuid,
}

type MemoryComponentCache = foyer::Cache<CacheKey, EntryComponentsSnapshot>;
type HybridComponentCache = HybridCache<CacheKey, EntryComponentsSnapshot>;

enum Backend {
    MemoryOnly(MemoryComponentCache),
    Hybrid(HybridComponentCache),
}

#[derive(Debug, thiserror::Error)]
pub(crate) enum Error {
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    #[error("failed to load entry components: {0}")]
    Load(#[from] foyer::Error),
}

pub(crate) struct EntryComponentCache {
    backend: Backend,
}

impl EntryComponentCache {
    pub(crate) fn memory_only(capacity: usize) -> Self {
        let cache = CacheBuilder::new(capacity)
            .with_weighter(cache_weight)
            .build();
        Self {
            backend: Backend::MemoryOnly(cache),
        }
    }

    pub(crate) async fn hybrid(config: HybridCacheConfig) -> Result<Self, foyer::Error> {
        std::fs::create_dir_all(&config.disk_path)?;

        #[cfg(target_os = "linux")]
        {
            match build_hybrid_cache(&config, true).await {
                Ok(cache) => {
                    tracing::info!(
                        path = %config.disk_path.display(),
                        memory_capacity = config.memory_capacity,
                        disk_capacity = config.disk_capacity,
                        io_engine = "io_uring",
                        "Entry component hybrid cache started"
                    );
                    return Ok(Self {
                        backend: Backend::Hybrid(cache),
                    });
                }
                Err(error) => {
                    tracing::warn!(
                        event = "entry_component_cache.io_uring_unavailable",
                        %error,
                        "Failed to start the entry component cache with io_uring; falling back to psync"
                    );
                }
            }
        }

        let cache = build_hybrid_cache(&config, false).await?;
        tracing::info!(
            path = %config.disk_path.display(),
            memory_capacity = config.memory_capacity,
            disk_capacity = config.disk_capacity,
            io_engine = "psync",
            "Entry component hybrid cache started"
        );
        Ok(Self {
            backend: Backend::Hybrid(cache),
        })
    }

    pub(crate) async fn get_or_load(
        &self,
        db: &sqlx::PgPool,
        entry_id: Uuid,
        components_version: Uuid,
    ) -> Result<BTreeMap<CompactString, EntryComponent>, Error> {
        let key = CacheKey {
            entry_id,
            components_version,
        };
        let db = db.clone();
        let fetch_db = db.clone();
        let fetch = move || async move { EntryComponentsSnapshot::load(&fetch_db, entry_id).await };

        let result = match &self.backend {
            Backend::MemoryOnly(cache) => cache
                .get_or_fetch(&key, fetch)
                .await
                .map(|entry| (entry.source(), entry.value().to_response())),
            Backend::Hybrid(cache) => cache
                .get_or_fetch(&key, fetch)
                .await
                .map(|entry| (entry.source(), entry.value().to_response())),
        };

        match result {
            Ok((source, components)) => {
                record_read(source);
                Ok(components)
            }
            Err(error) if error.kind() != foyer::ErrorKind::External => {
                metrics::counter!("boluo_server_entry_component_cache_storage_errors_total")
                    .increment(1);
                tracing::warn!(
                    event = "entry_component_cache.read_failed",
                    %error,
                    %entry_id,
                    %components_version,
                    "Entry component cache read failed; loading from PostgreSQL"
                );
                let snapshot = EntryComponentsSnapshot::load(&db, entry_id).await?;
                let components = snapshot.to_response();
                self.insert(key, snapshot);
                record_read(Source::Outer);
                Ok(components)
            }
            Err(error) => Err(Error::Load(error)),
        }
    }

    fn insert(&self, key: CacheKey, snapshot: EntryComponentsSnapshot) {
        match &self.backend {
            Backend::MemoryOnly(cache) => {
                cache.insert(key, snapshot);
            }
            Backend::Hybrid(cache) => {
                cache.insert(key, snapshot);
            }
        }
    }

    pub(crate) fn update_metrics(&self) {
        let (usage, entries, hybrid) = match &self.backend {
            Backend::MemoryOnly(cache) => (cache.usage(), cache.entries(), false),
            Backend::Hybrid(cache) => (cache.memory().usage(), cache.memory().entries(), true),
        };
        metrics::gauge!("boluo_server_entry_component_cache_memory_bytes").set(usage as f64);
        metrics::gauge!("boluo_server_entry_component_cache_memory_entries").set(entries as f64);
        metrics::gauge!("boluo_server_entry_component_cache_disk_enabled").set(hybrid as u8 as f64);
    }

    pub(crate) async fn close(&self) -> Result<(), foyer::Error> {
        match &self.backend {
            Backend::MemoryOnly(_) => Ok(()),
            Backend::Hybrid(cache) => cache.close().await,
        }
    }
}

fn cache_weight(_key: &CacheKey, snapshot: &EntryComponentsSnapshot) -> usize {
    snapshot.estimated_memory_bytes().max(1)
}

fn record_read(source: Source) {
    let result = match source {
        Source::Memory => "memory",
        Source::Disk => "disk",
        Source::Outer => "database",
    };
    metrics::counter!("boluo_server_entry_component_cache_read_total", "result" => result)
        .increment(1);
}

async fn build_hybrid_cache(
    config: &HybridCacheConfig,
    use_io_uring: bool,
) -> Result<HybridComponentCache, foyer::Error> {
    let device = FsDeviceBuilder::new(&config.disk_path)
        .with_capacity(config.disk_capacity)
        .build()?;
    let builder = HybridCacheBuilder::new()
        .with_name("entry_components")
        .with_policy(HybridCachePolicy::WriteOnInsertion)
        .memory(config.memory_capacity)
        .with_weighter(cache_weight)
        .storage()
        .with_engine_config(BlockEngineConfig::new(device))
        .with_recover_mode(RecoverMode::None)
        .with_compression(Compression::Lz4);

    #[cfg(target_os = "linux")]
    if use_io_uring {
        return builder
            .with_io_engine_config(
                Box::new(foyer::UringIoEngineConfig::new()) as Box<dyn foyer::IoEngineConfig>
            )
            .build()
            .await;
    }

    let _ = use_io_uring;
    builder
        .with_io_engine_config(PsyncIoEngineConfig::new())
        .build()
        .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn hybrid_cache_uses_disk_but_starts_empty() {
        let path = std::env::temp_dir().join(format!(
            "boluo-entry-component-cache-test-{}",
            Uuid::new_v4()
        ));
        let config = HybridCacheConfig {
            memory_capacity: 1024 * 1024,
            disk_capacity: 64 * 1024 * 1024,
            disk_path: path.clone(),
        };
        let cache = EntryComponentCache::hybrid(config.clone())
            .await
            .expect("start hybrid cache");
        let key = CacheKey {
            entry_id: Uuid::new_v4(),
            components_version: Uuid::new_v4(),
        };
        cache.insert(key, EntryComponentsSnapshot::empty());
        let Backend::Hybrid(hybrid) = &cache.backend else {
            panic!("expected a hybrid cache");
        };
        hybrid.storage().wait().await;
        hybrid.memory().clear();
        let entry = hybrid
            .get(&key)
            .await
            .expect("read component disk cache")
            .expect("component disk cache entry");
        assert_eq!(entry.source(), Source::Disk);
        assert!(entry.value().to_response().is_empty());
        cache.close().await.expect("close hybrid cache");
        drop(cache);

        let recovered = EntryComponentCache::hybrid(config)
            .await
            .expect("recover hybrid cache");
        let Backend::Hybrid(hybrid) = &recovered.backend else {
            panic!("expected a hybrid cache");
        };
        let entry = hybrid
            .get(&key)
            .await
            .expect("read freshly initialized component cache");
        assert!(entry.is_none());
        recovered.close().await.expect("close recovered cache");
        drop(recovered);
        std::fs::remove_dir_all(path).expect("remove hybrid cache test directory");
    }
}
