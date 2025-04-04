#[derive(Clone)]
pub struct CacheItem<T: Clone> {
    pub instant: std::time::Instant,
    pub payload: T,
}

impl<T: Clone> CacheItem<T> {
    pub fn new(payload: T) -> Self {
        Self {
            instant: std::time::Instant::now(),
            payload,
        }
    }
}
