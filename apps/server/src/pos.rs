use crate::error::CacheError;
use redis::AsyncCommands;
use uuid::Uuid;

fn create_max_pos_key(channel_id: &Uuid) -> String {
    format!("channel:{channel_id}:max_pos")
}

fn create_pos_key(channel_id: Uuid, message_id: Uuid) -> String {
    format!("channel:{channel_id}:preview:{message_id}:pos")
}

pub async fn alloc_new_pos(
    db: &mut sqlx::PgConnection,
    cache: &mut crate::cache::Connection,
    channel_id: Uuid,
) -> Result<i32, CacheError> {
    let max_pos_key = create_max_pos_key(&channel_id);
    let in_cache: bool = cache.inner.get::<_, Option<i32>>(&max_pos_key).await?.is_some();

    if !in_cache {
        // if not present, initialize it
        let (p, q) = crate::messages::Message::max_pos(db, &channel_id).await;
        let initial_pos = (p as f64 / q as f64).ceil() as i32 + 1;
        cache.inner.set_nx::<_, _, ()>(&max_pos_key, initial_pos).await?;
    }
    cache.inner.incr(&max_pos_key, 1).await
}

pub async fn pos(
    db: &mut sqlx::PgConnection,
    cache: &mut crate::cache::Connection,
    channel_id: Uuid,
    message_id: Uuid,
) -> Result<i32, CacheError> {
    let pos_key = create_pos_key(channel_id, message_id);
    let pos: Option<i32> = cache.inner.get(&pos_key).await?;
    if let Some(pos) = pos {
        Ok(pos)
    } else {
        let bottom: i32 = alloc_new_pos(db, cache, channel_id).await?;
        cache.inner.set_ex::<_, _, ()>(&pos_key, bottom, 60 * 5).await?;
        Ok(bottom)
    }
}

pub async fn reset_channel_pos(cache: &mut crate::cache::Connection, channel_id: &Uuid) -> Result<(), CacheError> {
    cache.inner.del(create_max_pos_key(channel_id)).await
}

pub async fn finished(
    cache: &mut crate::cache::Connection,
    channel_id: Uuid,
    message_id: Uuid,
) -> Result<i32, CacheError> {
    cache.inner.del(create_pos_key(channel_id, message_id)).await
}
