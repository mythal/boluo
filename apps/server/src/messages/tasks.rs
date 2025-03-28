use std::{collections::BTreeMap, time::Duration};

use chrono::{DateTime, Utc};
use futures::stream::StreamExt;
use tokio::{sync::Mutex, time::interval};
use tokio_stream::wrappers::IntervalStream;
use uuid::Uuid;

use crate::db;

pub fn start() {
    tokio::spawn(update_spaces_latest_activity());
}

pub static WAIT_UPDATE: Mutex<BTreeMap<Uuid, DateTime<Utc>>> = Mutex::const_new(BTreeMap::new());

async fn update_spaces_latest_activity() {
    IntervalStream::new(interval(Duration::from_secs(6)))
        .for_each(|_| async {
            let pool = db::get().await;
            let Ok(mut conn) = pool.acquire().await else {
                log::error!("Failed to acquire connection from pool");
                return;
            };
            let wait_update = {
                let mut local = BTreeMap::new();

                let Ok(mut wait_update) = WAIT_UPDATE.try_lock() else {
                    log::info!("Failed to lock WAIT_UPDATE");
                    return;
                };

                std::mem::swap(&mut *wait_update, &mut local);
                local
            };
            for (channel_id, update_time) in wait_update.into_iter() {
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
