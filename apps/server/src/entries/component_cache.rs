use std::sync::Arc;

use uuid::Uuid;

use super::models::EntryComponentsSnapshot;

const DEFAULT_CACHE_BYTES: usize = 16 * 1024 * 1024;
const ESTIMATED_CACHE_ITEMS: usize = 4096;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct CacheKey {
    entry_id: Uuid,
    components_version: Uuid,
}

#[derive(Clone)]
struct CacheValue {
    components: Arc<EntryComponentsSnapshot>,
    weight: u64,
}

#[derive(Clone)]
struct CacheWeighter;

impl quick_cache::Weighter<CacheKey, CacheValue> for CacheWeighter {
    fn weight(&self, _key: &CacheKey, value: &CacheValue) -> u64 {
        value.weight
    }
}

type MemoryCache = quick_cache::sync::Cache<CacheKey, CacheValue, CacheWeighter>;

pub(crate) struct EntryComponentMemoryCache {
    cache: MemoryCache,
}

impl EntryComponentMemoryCache {
    pub(crate) fn new() -> Self {
        let capacity = std::env::var("ENTRY_COMPONENT_CACHE_MB")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .and_then(|value| value.checked_mul(1024 * 1024))
            .unwrap_or(DEFAULT_CACHE_BYTES as u64);
        Self {
            cache: MemoryCache::with_weighter(ESTIMATED_CACHE_ITEMS, capacity, CacheWeighter),
        }
    }

    pub(crate) async fn get_or_load(
        &self,
        db: &sqlx::PgPool,
        entry_id: Uuid,
        components_version: Uuid,
    ) -> Result<Arc<EntryComponentsSnapshot>, sqlx::Error> {
        let key = CacheKey {
            entry_id,
            components_version,
        };
        if let Some(value) = self.cache.get(&key) {
            metrics::counter!("boluo_server_entry_component_cache_read_total", "result" => "memory")
                .increment(1);
            return Ok(value.components);
        }

        let components = Arc::new(EntryComponentsSnapshot::load(db, entry_id).await?);
        self.insert(key, components.clone());
        metrics::counter!(
            "boluo_server_entry_component_cache_read_total",
            "result" => "database"
        )
        .increment(1);
        Ok(components)
    }

    fn insert(&self, key: CacheKey, components: Arc<EntryComponentsSnapshot>) {
        let weight = components.estimated_memory_bytes() as u64;
        self.cache.insert(
            key,
            CacheValue {
                components,
                weight: weight.max(1),
            },
        );
    }

    #[cfg(test)]
    pub(crate) fn len(&self) -> usize {
        self.cache.len()
    }
}
