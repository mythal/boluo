use std::{collections::HashMap, sync::LazyLock};

use chrono::{DateTime, Utc};
use tracing::Instrument as _;
use uuid::Uuid;

use crate::db;

static NOTIFY_SPACE_ACTIVITY: LazyLock<tokio::sync::mpsc::Sender<(Uuid, DateTime<Utc>)>> =
    LazyLock::new(|| {
        let (tx, mut rx) = tokio::sync::mpsc::channel::<(Uuid, DateTime<Utc>)>(64);
        let span = tracing::info_span!(parent: None, "space_activity");
        tokio::spawn(async move {
            let mut map: HashMap<Uuid, DateTime<Utc>, _> =
                HashMap::with_hasher(ahash::RandomState::new());

            let pool = db::get().await;
            let mut interval = crate::utils::cleaner_interval(6);
            loop {
                tokio::select! {
                    Some((channel_id, update_time)) = rx.recv() => {
                        map.insert(channel_id, update_time);
                    }
                    _ = crate::shutdown::SHUTDOWN.notified() => {
                        break;
                    }
                    _ = interval.tick() => {
                        if !map.is_empty() {
                            let mut taken_map = HashMap::with_capacity_and_hasher(map.len(), ahash::RandomState::new());
                            std::mem::swap(&mut map, &mut taken_map);
                            // Update the database with the latest activity.
                            // Intentionally do NOT invalidate `CACHE.Space` here:
                            // latest_activity is a high-frequency field and we accept
                            // short-lived staleness to avoid cache-churn and extra fan-out.

                            let Ok(mut conn) = pool.acquire().await else {
                                tracing::warn!("Failed to acquire connection from pool, skipping.");
                                continue;
                            };
                            for (channel_id, update_time) in taken_map.into_iter() {
                                if let Err(err) = sqlx::query_file!(
                                    "sql/messages/update_space_latest_activity.sql",
                                    channel_id,
                                    update_time
                                )
                                .execute(&mut *conn)
                                .await
                                {
                                    tracing::error!(error = %err, "Failed to update activity for channel {}", channel_id);
                                };
                            }
                        }
                    }

                    else => {
                        tracing::warn!("Channel closed, exiting space activity task");
                        break;
                    }
                }
            }
        }.instrument(span));
        tx
    });

pub fn space_activity(channel_id: Uuid, update_time: Option<DateTime<Utc>>) {
    let tx = NOTIFY_SPACE_ACTIVITY.clone();
    if let Err(_err) = tx.try_send((channel_id, update_time.unwrap_or_else(Utc::now))) {
        tracing::info!(
            "Failed to send space activity notification: {}, tokio channel is full",
            channel_id
        );
    }
}
