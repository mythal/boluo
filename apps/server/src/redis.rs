use uuid::fmt::Hyphenated;
use uuid::Uuid;

use crate::utils::not_whitespace_only;

/// Get redis database connection.
pub async fn conn() -> Option<redis::aio::ConnectionManager> {
    static CLIENT: tokio::sync::OnceCell<Option<redis::aio::ConnectionManager>> =
        tokio::sync::OnceCell::const_new();
    CLIENT
        .get_or_init(|| async {
            let Some(redis_url) = std::env::var("REDIS_URL").ok().filter(not_whitespace_only)
            else {
                log::warn!("REDIS_URL not set, disabling redis");
                return None;
            };
            let client = redis::Client::open(redis_url).expect("Invalid Redis URL");
            let manager = client
                .get_connection_manager()
                .await
                .expect("Failed to connect to Redis");
            Some(manager)
        })
        .await
        .clone()
}

pub fn make_key(type_name: &[u8], id: &Uuid, field_name: &[u8]) -> Vec<u8> {
    let type_name_len = type_name.len();
    let mut buffer = vec![0; type_name_len + 1 + Hyphenated::LENGTH + 1 + field_name.len()];
    buffer[0..type_name_len].copy_from_slice(type_name);
    buffer[type_name_len] = b':';
    let id_start = type_name_len + 1;
    let id_end = id_start + Hyphenated::LENGTH;
    id.as_hyphenated()
        .encode_lower(&mut buffer[id_start..id_end]);
    let field_start = id_end + 1;
    buffer[id_end] = b':';
    buffer[field_start..].copy_from_slice(field_name);
    buffer
}

pub async fn check() {
    use redis::AsyncCommands;
    let Some(mut redis) = conn().await else {
        log::warn!("Redis connection not available");
        return;
    };
    let _result: Option<String> = redis.get("hello").await.expect("Failed to get redis");
}
