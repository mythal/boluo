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
    loop {
        match cache.get_value_or_guard_async(&key).await {
            Ok(entry) if !entry.is_expired() => return Ok(entry.payload),
            Ok(expired_entry) => {
                let expired_at = expired_entry.instant;
                cache.remove_if(&key, |current| current.instant == expired_at);
            }
            Err(guard) => {
                let payload = fetcher.await?;
                // `insert` fails if an invalidation or a newer insert removed this placeholder.
                // In that case this caller may still use its snapshot, but it must not cache it.
                let _ = guard.insert(payload.clone().into());
                return Ok(payload);
            }
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

#[cfg(test)]
mod tests {
    use super::*;
    use quick_cache::sync::Cache;
    use std::convert::Infallible;
    use std::sync::Arc;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, Eq)]
    struct TestValue(&'static str);

    impl Lifespan for TestValue {
        fn ttl_sec() -> u64 {
            u64::MAX
        }
    }

    #[derive(Clone, Debug, PartialEq, Eq)]
    struct ImmediatelyExpiredValue(&'static str);

    impl Lifespan for ImmediatelyExpiredValue {
        fn ttl_sec() -> u64 {
            0
        }
    }

    #[tokio::test]
    async fn invalidated_in_flight_fill_does_not_overwrite_newer_cache_entry() {
        let cache = Arc::new(Cache::<Uuid, Mortal<TestValue>>::new(16));
        let key = Uuid::new_v4();
        let (fetch_started_tx, fetch_started_rx) = tokio::sync::oneshot::channel();
        let (release_fetch_tx, release_fetch_rx) = tokio::sync::oneshot::channel();

        let fetch_cache = Arc::clone(&cache);
        let fetch_task = tokio::spawn(async move {
            fetch_entry(&fetch_cache, key, async move {
                fetch_started_tx
                    .send(())
                    .expect("test receiver was dropped");
                release_fetch_rx
                    .await
                    .expect("fetch release sender was dropped");
                Ok::<_, Infallible>(TestValue("stale"))
            })
            .await
            .expect("infallible fetch failed")
        });

        fetch_started_rx.await.expect("cache fill did not start");
        cache.remove(&key);
        cache.insert(key, Mortal::new(TestValue("fresh")));
        release_fetch_tx
            .send(())
            .expect("cache fill task was dropped");

        assert_eq!(
            fetch_task.await.expect("cache fill task panicked"),
            TestValue("stale"),
            "an already-running read may return its previous committed snapshot"
        );
        assert_eq!(
            cache
                .get(&key)
                .expect("the newer cache entry disappeared")
                .fresh_only(),
            Some(TestValue("fresh")),
            "a cache fill invalidated while in flight overwrote newer state"
        );
    }

    #[tokio::test]
    async fn invalidated_expired_entry_refresh_does_not_overwrite_newer_cache_entry() {
        let cache = Arc::new(Cache::<Uuid, Mortal<ImmediatelyExpiredValue>>::new(16));
        let key = Uuid::new_v4();
        cache.insert(
            key,
            Mortal {
                instant: std::time::Instant::now() - std::time::Duration::from_secs(2),
                payload: ImmediatelyExpiredValue("expired"),
            },
        );
        let (fetch_started_tx, fetch_started_rx) = tokio::sync::oneshot::channel();
        let (release_fetch_tx, release_fetch_rx) = tokio::sync::oneshot::channel();

        let fetch_cache = Arc::clone(&cache);
        let fetch_task = tokio::spawn(async move {
            fetch_entry(&fetch_cache, key, async move {
                fetch_started_tx
                    .send(())
                    .expect("test receiver was dropped");
                release_fetch_rx
                    .await
                    .expect("fetch release sender was dropped");
                Ok::<_, Infallible>(ImmediatelyExpiredValue("stale refresh"))
            })
            .await
            .expect("infallible fetch failed")
        });

        fetch_started_rx
            .await
            .expect("expired entry refresh did not start");
        cache.remove(&key);
        cache.insert(key, Mortal::new(ImmediatelyExpiredValue("fresh")));
        release_fetch_tx
            .send(())
            .expect("cache refresh task was dropped");

        assert_eq!(
            fetch_task.await.expect("cache refresh task panicked"),
            ImmediatelyExpiredValue("stale refresh")
        );
        assert_eq!(
            cache
                .get(&key)
                .expect("the newer cache entry disappeared")
                .payload,
            ImmediatelyExpiredValue("fresh"),
            "an invalidated expired-entry refresh overwrote newer state"
        );
    }
}
