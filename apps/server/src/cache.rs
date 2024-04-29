use crate::error::CacheError;
pub use redis::aio::ConnectionManager;
pub use redis::AsyncCommands;
use uuid::fmt::Hyphenated;
use uuid::Uuid;

#[derive(Clone)]
pub struct Connection {
    pub inner: ConnectionManager,
}

impl Connection {
    fn new(inner: ConnectionManager) -> Connection {
        Connection { inner }
    }

    pub async fn get(&mut self, key: &[u8]) -> Result<Option<Vec<u8>>, CacheError> {
        self.inner.get(key).await
    }

    pub async fn set(&mut self, key: &[u8], value: &[u8]) -> Result<(), CacheError> {
        self.inner.set(key, value).await
    }

    pub async fn set_with_expiration(&mut self, key: &[u8], value: &[u8], seconds: u64) -> Result<(), CacheError> {
        self.inner.set_ex(key, value, seconds).await
    }

    pub async fn remove(&mut self, key: &[u8]) -> Result<(), CacheError> {
        self.inner.del(key).await
    }
}

#[derive(Clone)]
pub struct RedisFactory {
    client: redis::Client,
}

impl RedisFactory {
    pub fn new() -> RedisFactory {
        use std::env::var;
        if cfg!(test) {
            dotenv::dotenv().ok();
        }
        let url = var("REDIS_URL").expect("Failed to load Redis URL");
        let client = redis::Client::open(&*url).unwrap();
        RedisFactory { client }
    }
}

/// Get cache database connection.
pub async fn conn() -> redis::RedisResult<Connection> {
    use std::env::var;
    use std::sync::OnceLock;
    static CLIENT: OnceLock<redis::Client> = OnceLock::new();
    let client = CLIENT.get_or_init(|| {
        if cfg!(test) {
            dotenv::from_filename(".env.test.local").ok();
            dotenv::from_filename(".env.local").ok();
            dotenv::dotenv().ok();
        };
        let url = if let Ok(url) = var("REDIS_URL") {
            url
        } else {
            log::warn!("Failed to load Redis URL, use default");
            "redis://127.0.0.1/".to_string()
        };
        redis::Client::open(&*url).expect("Unable to open redis")
    });

    let connection_manager = client.get_connection_manager().await?;
    Ok(Connection::new(connection_manager))
}

pub fn make_key(type_name: &[u8], id: &Uuid, field_name: &[u8]) -> Vec<u8> {
    let type_name_len = type_name.len();
    let mut buffer = vec![0; type_name_len + 1 + Hyphenated::LENGTH + 1 + field_name.len()];
    buffer[0..type_name_len].copy_from_slice(type_name);
    buffer[type_name_len] = b':';
    let id_start = type_name_len + 1;
    let id_end = id_start + Hyphenated::LENGTH;
    id.as_hyphenated().encode_lower(&mut buffer[id_start..id_end]);
    let field_start = id_end + 1;
    buffer[id_end] = b':';
    buffer[field_start..].copy_from_slice(field_name);
    buffer
}

pub async fn check() {
    let mut cache = conn().await.unwrap();
    let _result: Option<String> = cache.inner.get("hello").await.expect("Failed to get cache");
}
