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
}

pub mod day {
    pub const ONE: u64 = 60 * 60 * 24;
    pub const HALF: u64 = 60 * 60 * 12;
}

#[derive(Clone)]
pub struct Ttl<T: Clone, const TTL_SEC: u64> {
    pub instant: std::time::Instant,
    pub payload: T,
}

impl<T: Clone, const TTL: u64> Ttl<T, TTL> {
    const HALF_DAY: u64 = 60 * 60 * 12;
    pub fn new(payload: T) -> Self {
        Self {
            instant: std::time::Instant::now(),
            payload,
        }
    }
    pub fn is_expired(&self) -> bool {
        self.instant.elapsed().as_secs() > TTL
    }

    pub fn is_expired_at(&self, instant: std::time::Instant) -> bool {
        if instant < self.instant {
            return true;
        }
        instant.duration_since(self.instant).as_secs() > TTL
    }

    pub fn reset(&mut self) {
        self.instant = std::time::Instant::now();
    }

    pub fn reset_at(&mut self, instant: std::time::Instant) {
        self.instant = instant;
    }

    pub fn into_inner(self) -> T {
        self.payload
    }
}

impl<T: Clone, const TTL: u64> From<T> for Ttl<T, TTL> {
    fn from(payload: T) -> Self {
        Self::new(payload)
    }
}

impl<T: Clone, const TTL: u64> std::ops::Deref for Ttl<T, TTL> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.payload
    }
}

// pub async fn fetch_entry<T, const TTL: u64, C, F>(
//     cache: &C,
//     key: Uuid,
//     fetcher: F,
// ) -> Result<T, sqlx::Error>
// where
//     T: Clone + Send + 'static,
//     F: AsyncFn() -> Result<Ttl<T, TTL>, sqlx::Error> + Send + 'static,
//     C: Deref<Target = Cache<Uuid, Ttl<T, TTL>>>,
// {
//     let cache = cache.deref();
//     let entry = cache
//         .get_or_insert_async(&key, async move { fetcher().await })
//         .await?;
//     if entry.is_expired() {
//         let new_entry = fetcher().await?;
//         cache.insert(key, new_entry.clone());
//         Ok(new_entry.into_inner())
//     } else {
//         Ok(entry.into_inner())
//     }
// }
