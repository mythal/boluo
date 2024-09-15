use crate::error::CacheError;
use deadpool_redis::redis::AsyncCommands;
use uuid::Uuid;

fn create_max_pos_key(channel_id: &Uuid) -> String {
    format!("channel:{channel_id}:max_pos")
}

fn create_pos_key(channel_id: Uuid, message_id: Uuid) -> String {
    format!("channel:{channel_id}:preview:{message_id}:pos")
}

pub async fn ensure_pos_largest(
    redis_conn: &mut deadpool_redis::Connection,
    channel_id: Uuid,
    pos: i32,
) -> Result<(), CacheError> {
    let max_pos_key = create_max_pos_key(&channel_id);
    let current_max: i32 = redis_conn.get::<_, Option<i32>>(&max_pos_key).await?.unwrap_or(1);
    if pos > current_max {
        redis_conn.set::<_, _, ()>(&max_pos_key, pos).await?;
    }
    Ok(())
}

pub async fn alloc_new_pos(
    db: &mut sqlx::PgConnection,
    redis_conn: &mut deadpool_redis::Connection,
    channel_id: Uuid,
) -> Result<i32, CacheError> {
    let max_pos_key = create_max_pos_key(&channel_id);
    let in_cache: bool = redis_conn.get::<_, Option<i32>>(&max_pos_key).await?.is_some();

    if !in_cache {
        // if not present, initialize it
        let (p, q) = crate::messages::Message::max_pos(db, &channel_id).await;
        let initial_pos = (p as f64 / q as f64).ceil() as i32 + 1;
        redis_conn.set_nx::<_, _, ()>(&max_pos_key, initial_pos).await?;
    }
    redis_conn.incr(&max_pos_key, 1).await
}

pub async fn pos(
    db: &mut sqlx::PgConnection,
    redis_conn: &mut deadpool_redis::Connection,
    channel_id: Uuid,
    message_id: Uuid,
    keep_seconds: u64,
) -> Result<i32, CacheError> {
    let pos_key = create_pos_key(channel_id, message_id);
    let pos: Option<i32> = redis_conn.get(&pos_key).await?;
    if let Some(pos) = pos {
        Ok(pos)
    } else {
        let bottom: i32 = alloc_new_pos(db, redis_conn, channel_id).await?;
        redis_conn.set_ex::<_, _, ()>(&pos_key, bottom, keep_seconds).await?;
        Ok(bottom)
    }
}

pub async fn reset_channel_pos(
    redis_conn: &mut deadpool_redis::Connection,
    channel_id: &Uuid,
) -> Result<(), CacheError> {
    redis_conn.del(create_max_pos_key(channel_id)).await
}

pub async fn finished(
    redis_conn: &mut deadpool_redis::Connection,
    channel_id: Uuid,
    message_id: Uuid,
) -> Result<i32, CacheError> {
    redis_conn.del(create_pos_key(channel_id, message_id)).await
}
