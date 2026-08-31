use std::collections::BTreeMap;
use std::path::PathBuf;

use compact_str::CompactString;
use foyer::{
    BlockEngineConfig, CacheBuilder, Compression, DeviceBuilder, FsDeviceBuilder, HybridCache,
    HybridCacheBuilder, HybridCachePolicy, RecoverMode, Source,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::entries::models::{EntryComponent, EntryComponentsSnapshot};
use crate::notes::models::NotePayload;

pub(crate) const DEFAULT_MEMORY_CACHE_BYTES: usize = 16 * 1024 * 1024;
pub(crate) const DEFAULT_DISK_CACHE_BYTES: usize = 512 * 1024 * 1024;
const DISK_CACHE_BLOCK_BYTES: usize = 4 * 1024 * 1024;
const DISK_CACHE_BUFFER_POOL_BYTES: usize = 4 * 1024 * 1024;
const DISK_CACHE_SUBMIT_QUEUE_BYTES: usize = 8 * 1024 * 1024;
const DISK_CACHE_INDEXER_SHARDS: usize = 16;

#[derive(Debug, Clone)]
pub(crate) struct HybridCacheConfig {
    pub(crate) memory_capacity: usize,
    pub(crate) disk_capacity: usize,
    pub(crate) disk_path: PathBuf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
enum CacheKey {
    EntryComponents {
        entry_id: Uuid,
        components_version: Uuid,
    },
    NotePayload {
        note_id: Uuid,
        revision: i64,
    },
}

#[derive(Debug, Serialize, Deserialize)]
enum CachedPayload {
    EntryComponents(EntryComponentsSnapshot),
    NotePayload(NotePayload),
}

type MemoryPayloadCache = foyer::Cache<CacheKey, CachedPayload>;
type HybridPayloadCache = HybridCache<CacheKey, CachedPayload>;

enum Backend {
    MemoryOnly(MemoryPayloadCache),
    Hybrid(HybridPayloadCache),
}

#[derive(Debug, thiserror::Error)]
pub(crate) enum Error {
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    #[error("failed to load a Space payload: {0}")]
    Load(#[from] foyer::Error),
    #[error("Space payload cache returned a value of the wrong type")]
    TypeMismatch,
}

pub(crate) struct SpacePayloadCache {
    backend: Backend,
}

impl SpacePayloadCache {
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

        let cache = build_hybrid_cache(&config).await?;
        tracing::info!(
            path = %config.disk_path.display(),
            memory_capacity = config.memory_capacity,
            disk_capacity = config.disk_capacity,
            "Space payload hybrid cache started"
        );
        Ok(Self {
            backend: Backend::Hybrid(cache),
        })
    }

    pub(crate) async fn entry_components(
        &self,
        db: &sqlx::PgPool,
        entry_id: Uuid,
        components_version: Uuid,
    ) -> Result<BTreeMap<CompactString, EntryComponent>, Error> {
        let key = CacheKey::EntryComponents {
            entry_id,
            components_version,
        };
        let db = db.clone();
        let fetch_db = db.clone();
        let fetch = move || async move {
            EntryComponentsSnapshot::load(&fetch_db, entry_id)
                .await
                .map(CachedPayload::EntryComponents)
        };

        let result = match &self.backend {
            Backend::MemoryOnly(cache) => cache.get_or_fetch(&key, fetch).await.map(|entry| {
                let components = match entry.value() {
                    CachedPayload::EntryComponents(components) => Ok(components.to_response()),
                    CachedPayload::NotePayload(_) => Err(Error::TypeMismatch),
                };
                (entry.source(), components)
            }),
            Backend::Hybrid(cache) => cache.get_or_fetch(&key, fetch).await.map(|entry| {
                let components = match entry.value() {
                    CachedPayload::EntryComponents(components) => Ok(components.to_response()),
                    CachedPayload::NotePayload(_) => Err(Error::TypeMismatch),
                };
                (entry.source(), components)
            }),
        };

        match result {
            Ok((source, components)) => {
                record_read("entry_components", source);
                components
            }
            Err(error) if error.kind() != foyer::ErrorKind::External => {
                record_storage_error("entry_components");
                tracing::warn!(
                    event = "space_payload_cache.read_failed",
                    payload = "entry_components",
                    %error,
                    %entry_id,
                    %components_version,
                    "Space payload cache read failed; loading Entry components from PostgreSQL"
                );
                let snapshot = EntryComponentsSnapshot::load(&db, entry_id).await?;
                let components = snapshot.to_response();
                self.insert(key, CachedPayload::EntryComponents(snapshot));
                record_read("entry_components", Source::Outer);
                Ok(components)
            }
            Err(error) => Err(Error::Load(error)),
        }
    }

    pub(crate) async fn note_payload(
        &self,
        db: &sqlx::PgPool,
        space_id: Uuid,
        note_id: Uuid,
        revision: i64,
    ) -> Result<Option<NotePayload>, Error> {
        let key = CacheKey::NotePayload { note_id, revision };
        let db = db.clone();
        let fetch_db = db.clone();
        let fetch = move || async move {
            NotePayload::load(&fetch_db, space_id, note_id)
                .await?
                .map(CachedPayload::NotePayload)
                .ok_or(sqlx::Error::RowNotFound)
        };

        let result = match &self.backend {
            Backend::MemoryOnly(cache) => cache.get_or_fetch(&key, fetch).await.map(|entry| {
                let note = match entry.value() {
                    CachedPayload::NotePayload(note) => Ok(note.clone()),
                    CachedPayload::EntryComponents(_) => Err(Error::TypeMismatch),
                };
                (entry.source(), note)
            }),
            Backend::Hybrid(cache) => cache.get_or_fetch(&key, fetch).await.map(|entry| {
                let note = match entry.value() {
                    CachedPayload::NotePayload(note) => Ok(note.clone()),
                    CachedPayload::EntryComponents(_) => Err(Error::TypeMismatch),
                };
                (entry.source(), note)
            }),
        };

        match result {
            Ok((source, note)) => {
                record_read("note", source);
                note.map(Some)
            }
            Err(error) if is_row_not_found(&error) => Ok(None),
            Err(error) if error.kind() != foyer::ErrorKind::External => {
                record_storage_error("note");
                tracing::warn!(
                    event = "space_payload_cache.read_failed",
                    payload = "note",
                    %error,
                    %space_id,
                    %note_id,
                    revision,
                    "Space payload cache read failed; loading Note payload from PostgreSQL"
                );
                let Some(note) = NotePayload::load(&db, space_id, note_id).await? else {
                    return Ok(None);
                };
                self.insert(key, CachedPayload::NotePayload(note.clone()));
                record_read("note", Source::Outer);
                Ok(Some(note))
            }
            Err(error) => Err(Error::Load(error)),
        }
    }

    fn insert(&self, key: CacheKey, payload: CachedPayload) {
        match &self.backend {
            Backend::MemoryOnly(cache) => {
                cache.insert(key, payload);
            }
            Backend::Hybrid(cache) => {
                cache.insert(key, payload);
            }
        }
    }

    pub(crate) fn update_metrics(&self) {
        let (usage, entries, hybrid) = match &self.backend {
            Backend::MemoryOnly(cache) => (cache.usage(), cache.entries(), false),
            Backend::Hybrid(cache) => (cache.memory().usage(), cache.memory().entries(), true),
        };
        metrics::gauge!("boluo_server_space_payload_cache_memory_bytes").set(usage as f64);
        metrics::gauge!("boluo_server_space_payload_cache_memory_entries").set(entries as f64);
        metrics::gauge!("boluo_server_space_payload_cache_disk_enabled").set(hybrid as u8 as f64);

        // Keep idle-cache counters visible to metrics consumers.
        for payload in ["entry_components", "note"] {
            for result in ["memory", "disk", "database"] {
                metrics::counter!(
                    "boluo_server_space_payload_cache_read_total",
                    "payload" => payload,
                    "result" => result,
                )
                .absolute(0);
            }
            metrics::counter!(
                "boluo_server_space_payload_cache_storage_errors_total",
                "payload" => payload,
            )
            .absolute(0);
        }
    }

    pub(crate) async fn close(&self) -> Result<(), foyer::Error> {
        match &self.backend {
            Backend::MemoryOnly(_) => Ok(()),
            Backend::Hybrid(cache) => cache.close().await,
        }
    }
}

fn cache_weight(_key: &CacheKey, payload: &CachedPayload) -> usize {
    match payload {
        CachedPayload::EntryComponents(components) => components.estimated_memory_bytes(),
        CachedPayload::NotePayload(note) => note.estimated_memory_bytes(),
    }
    .max(1)
}

fn is_row_not_found(error: &foyer::Error) -> bool {
    error
        .downcast_ref::<sqlx::Error>()
        .is_some_and(|error| matches!(error, sqlx::Error::RowNotFound))
}

fn record_storage_error(payload: &'static str) {
    metrics::counter!("boluo_server_space_payload_cache_storage_errors_total", "payload" => payload)
        .increment(1);
}

fn record_read(payload: &'static str, source: Source) {
    let result = match source {
        Source::Memory => "memory",
        Source::Disk => "disk",
        Source::Outer => "database",
    };
    metrics::counter!(
        "boluo_server_space_payload_cache_read_total",
        "payload" => payload,
        "result" => result
    )
    .increment(1);
}

async fn build_hybrid_cache(
    config: &HybridCacheConfig,
) -> Result<HybridPayloadCache, foyer::Error> {
    let device = FsDeviceBuilder::new(&config.disk_path)
        .with_capacity(config.disk_capacity)
        .build()?;
    HybridCacheBuilder::new()
        .with_name("space_payloads")
        .with_policy(HybridCachePolicy::WriteOnInsertion)
        .memory(config.memory_capacity)
        .with_weighter(cache_weight)
        .storage()
        .with_engine_config(
            BlockEngineConfig::new(device)
                .with_block_size(DISK_CACHE_BLOCK_BYTES)
                .with_buffer_pool_size(DISK_CACHE_BUFFER_POOL_BYTES)
                .with_submit_queue_size_threshold(DISK_CACHE_SUBMIT_QUEUE_BYTES)
                .with_indexer_shards(DISK_CACHE_INDEXER_SHARDS),
        )
        .with_recover_mode(RecoverMode::None)
        .with_compression(Compression::Lz4)
        .build()
        .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn hybrid_cache_uses_disk_but_starts_empty() {
        let path =
            std::env::temp_dir().join(format!("boluo-space-payload-cache-test-{}", Uuid::new_v4()));
        let config = HybridCacheConfig {
            memory_capacity: 1024 * 1024,
            disk_capacity: 64 * 1024 * 1024,
            disk_path: path.clone(),
        };
        let cache = SpacePayloadCache::hybrid(config.clone())
            .await
            .expect("start hybrid cache");
        let key = CacheKey::EntryComponents {
            entry_id: Uuid::new_v4(),
            components_version: Uuid::new_v4(),
        };
        let note_key = CacheKey::NotePayload {
            note_id: Uuid::new_v4(),
            revision: 1,
        };
        cache.insert(
            key,
            CachedPayload::EntryComponents(EntryComponentsSnapshot::empty()),
        );
        cache.insert(note_key, CachedPayload::NotePayload(NotePayload::empty()));
        let Backend::Hybrid(hybrid) = &cache.backend else {
            panic!("expected a hybrid cache");
        };
        hybrid.storage().wait().await;
        hybrid.memory().clear();
        let entry = hybrid
            .get(&key)
            .await
            .expect("read payload disk cache")
            .expect("payload disk cache entry");
        assert_eq!(entry.source(), Source::Disk);
        let CachedPayload::EntryComponents(components) = entry.value() else {
            panic!("expected Entry components");
        };
        assert!(components.to_response().is_empty());
        let note = hybrid
            .get(&note_key)
            .await
            .expect("read Note payload disk cache")
            .expect("Note payload disk cache entry");
        assert_eq!(note.source(), Source::Disk);
        assert!(matches!(note.value(), CachedPayload::NotePayload(_)));
        cache.close().await.expect("close hybrid cache");
        drop(cache);

        let recovered = SpacePayloadCache::hybrid(config)
            .await
            .expect("recover hybrid cache");
        let Backend::Hybrid(hybrid) = &recovered.backend else {
            panic!("expected a hybrid cache");
        };
        let entry = hybrid
            .get(&key)
            .await
            .expect("read freshly initialized payload cache");
        assert!(entry.is_none());
        let note = hybrid
            .get(&note_key)
            .await
            .expect("read freshly initialized Note payload cache");
        assert!(note.is_none());
        recovered.close().await.expect("close recovered cache");
        drop(recovered);
        std::fs::remove_dir_all(path).expect("remove hybrid cache test directory");
    }
}
