use deadpool_redis::redis::AsyncCommands;
use uuid::fmt::Hyphenated;
use uuid::Uuid;

pub type RedisPool = deadpool_redis::Pool;

/// Get cache database connection.
pub async fn conn() -> deadpool_redis::Connection {
    use std::env::var;
    use std::sync::OnceLock;
    static CLIENT: OnceLock<RedisPool> = OnceLock::new();
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
        let config = deadpool_redis::Config::from_url(&*url);
        config
            .create_pool(Some(deadpool_redis::Runtime::Tokio1))
            .expect("Failed to create Redis pool")
    });
    client.get().await.expect("Failed to get Redis connection")
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
    let mut cache = conn().await;
    let _result: Option<String> = cache.get("hello").await.expect("Failed to get cache");
}
