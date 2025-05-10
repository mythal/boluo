use std::future::Future;

pub mod minute {
    pub const ONE: u64 = 60;
    pub const HALF: u64 = 30;
    pub const TWO: u64 = 120;
    pub const QUARTER: u64 = 15;
}

pub mod hour {
    pub const ONE: u64 = 60 * 60;
    pub const TWO: u64 = 60 * 60 * 2;
    pub const FOUR: u64 = 60 * 60 * 4;
    pub const EIGHT: u64 = 60 * 60 * 8;
    pub const HALF: u64 = 60 * 30;
    pub const QUARTER: u64 = 60 * 15;
}

pub mod day {
    pub const ONE: u64 = 60 * 60 * 24;
    pub const HALF: u64 = 60 * 60 * 12;
}

#[derive(Clone)]
pub struct Mortal<T: Send + Sync + 'static> {
    pub instant: std::time::Instant,
    payload: T,
}

impl<T: Lifespan> Mortal<T> {
    const HALF_DAY: u64 = 60 * 60 * 12;
    pub fn new(payload: T) -> Self {
        Self {
            instant: std::time::Instant::now(),
            payload,
        }
    }
    pub fn is_expired(&self) -> bool {
        self.instant.elapsed().as_secs() > T::ttl_sec()
    }

    pub fn is_expired_at(&self, instant: std::time::Instant) -> bool {
        if instant < self.instant {
            return true;
        }
        instant.duration_since(self.instant).as_secs() > T::ttl_sec()
    }

    pub fn reset(&mut self) {
        self.instant = std::time::Instant::now();
    }

    pub fn reset_at(&mut self, instant: std::time::Instant) {
        self.instant = instant;
    }

    pub fn fresh_only(self) -> Option<T> {
        if self.is_expired() {
            return None;
        }
        Some(self.payload)
    }
}

pub trait Lifespan: Send + Sync + 'static {
    fn ttl_sec() -> u64;
}

impl<T: Lifespan> From<T> for Mortal<T> {
    fn from(payload: T) -> Self {
        Self::new(payload)
    }
}

pub async fn fetch_entry<T, F, E>(
    cache: &quick_cache::sync::Cache<uuid::Uuid, Mortal<T>>,
    key: uuid::Uuid,
    fetcher: F,
) -> Result<T, E>
where
    F: Future<Output = Result<T, E>>,
    T: Clone + Lifespan,
{
    match cache.get_value_or_guard_async(&key).await {
        Ok(entry) => {
            if !entry.is_expired() {
                return Ok(entry.payload);
            } else {
                let payload = fetcher.await?;
                cache.insert(key, payload.clone().into());
                // TODO: compare the payload with the old one, check cache consistency
                Ok(payload)
            }
        }
        Err(guard) => {
            let payload = fetcher.await?;
            if let Err(payload) = guard.insert(payload.clone().into()) {
                cache.insert(key, payload);
            }
            Ok(payload)
        }
    }
}

pub async fn fetch_entry_optional<T, F>(
    cache: &quick_cache::sync::Cache<uuid::Uuid, Mortal<T>>,
    key: uuid::Uuid,
    fetcher: F,
) -> Result<Option<T>, sqlx::Error>
where
    F: Future<Output = Result<T, sqlx::Error>>,
    T: Clone + Lifespan,
{
    let fetched = fetch_entry(cache, key, fetcher).await;
    match fetched {
        Ok(payload) => Ok(Some(payload)),
        Err(sqlx::Error::RowNotFound) => Ok(None),
        Err(e) => Err(e),
    }
}
