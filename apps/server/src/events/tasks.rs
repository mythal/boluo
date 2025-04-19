use crate::db;
use crate::events::context::get_broadcast_table;
use crate::events::Update;
use crate::spaces::Space;
use crate::utils::timestamp;
use futures::StreamExt;
use std::time::Duration;
use tokio::time::interval;
use tokio_stream::wrappers::IntervalStream;

pub fn start() {
    tokio::spawn(events_clean());
    tokio::spawn(broadcast_clean());
    tokio::spawn(push_status());
    tokio::spawn(super::handlers::token_clean());
}

async fn push_status() {
    IntervalStream::new(interval(Duration::from_secs(4)))
        .for_each(|_| async {
            let pool = db::get().await;
            let spaces = Space::recent(&pool).await.unwrap_or_default();

            for space_id in spaces {
                Update::push_status(space_id).await.ok();
            }
        })
        .await;
}

async fn events_clean() {
    IntervalStream::new(interval(Duration::from_secs(60 * 60 * 2)))
        .for_each(|_| async {
            let before = timestamp() - 12 * 60 * 60 * 1000;
            let mut mailbox_map = super::context::store().mailboxes.pin();
            mailbox_map.retain(|_id, mailbox| {
                let mut before = before;

                let events_is_empty = if let Some(mut updates) = mailbox.updates.try_lock() {
                    while let Some(encoded_update) = updates.pop_front() {
                        if updates.len() < 1024 && encoded_update.update.id.timestamp > before {
                            before = encoded_update.update.id.timestamp - 1;
                            updates.push_front(encoded_update);
                            break;
                        }
                    }
                    updates.is_empty()
                } else {
                    return true;
                };

                let preview_map_is_empty = {
                    let mut preview_map = mailbox.preview_map.pin();
                    preview_map.retain(|_, preview| preview.update.id.timestamp > before);
                    preview_map.is_empty()
                };

                !(events_is_empty && preview_map_is_empty)
            });
        })
        .await;
}

async fn broadcast_clean() {
    IntervalStream::new(interval(Duration::from_secs(5 * 60)))
        .for_each(|_| async {
            let mut broadcast_table = get_broadcast_table().pin();
            let before_count = broadcast_table.len();
            broadcast_table.retain(|_, v| v.receiver_count() != 0);
            log::info!(
                "finish broadcast clean, {} -> {}",
                before_count,
                broadcast_table.len()
            );
        })
        .await;
}
