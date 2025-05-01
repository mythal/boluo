use std::{collections::BTreeMap, time::Duration};

use chrono::{DateTime, Utc};
use futures::stream::StreamExt;
use parking_lot::Mutex;
use tokio::time::interval;
use tokio_stream::wrappers::IntervalStream;
use uuid::Uuid;

use crate::{db, events::context::WAIT_MORE};

pub fn start() {
    tokio::spawn(update_spaces_latest_activity());
}

pub static RECENTLY_UPDATED_SPACES: Mutex<BTreeMap<Uuid, DateTime<Utc>>> =
    Mutex::new(BTreeMap::new());

async fn update_spaces_latest_activity() {
    IntervalStream::new(interval(Duration::from_secs(6)))
        .for_each(|_| async {
            let pool = db::get().await;
            let Ok(mut conn) = pool.acquire().await else {
                log::error!("Failed to acquire connection from pool");
                return;
            };
            let space_updated_map = {
                let mut map = BTreeMap::new();
                let Some(mut space_updated_map) = RECENTLY_UPDATED_SPACES.try_lock_for(WAIT_MORE)
                else {
                    log::error!("Failed to lock RECENTLY_UPDATED_SPACES");
                    return;
                };

                std::mem::swap(&mut *space_updated_map, &mut map);
                map
            };
            for (channel_id, update_time) in space_updated_map.into_iter() {
                if let Err(err) = sqlx::query_file!(
                    "sql/messages/update_space_latest_activity.sql",
                    channel_id,
                    update_time
                )
                .execute(&mut *conn)
                .await
                {
                    log::error!("Failed to update space latest activity: {:?}", err);
                };
            }
        })
        .await;
}
