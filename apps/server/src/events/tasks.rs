use crate::db;
use crate::events::context::get_broadcast_table;
use crate::events::Event;
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
}

async fn push_status() {
    IntervalStream::new(interval(Duration::from_secs(4)))
        .for_each(|_| async {
            let pool = db::get().await;
            let spaces = Space::recent(&pool).await.unwrap_or_default();

            for space_id in spaces {
                Event::push_status(space_id).await.ok();
            }
        })
        .await;
}

async fn events_clean() {
    IntervalStream::new(interval(Duration::from_secs(60 * 60 * 2)))
        .for_each(|_| async {
            let before = timestamp() - 12 * 60 * 60 * 1000;
            let mut mailbox_map = super::context::store().mailboxes.pin();
            mailbox_map.retain(|id, mailbox| {
                let mut before = before;

                let Ok(mut mailbox) = mailbox.try_lock() else {
                    log::warn!("mailbox lock failed, id: {}", id);
                    return true;
                };
                while let Some(event) = mailbox.events.pop_front() {
                    if mailbox.events.len() < 1024 && event.event.id.timestamp > before {
                        before = event.event.id.timestamp - 1;
                        mailbox.events.push_front(event);
                        break;
                    }
                }
                mailbox
                    .preview_map
                    .retain(|_, preview| preview.event.id.timestamp > before);

                mailbox
                    .edition_map
                    .retain(|_, edition| edition.event.id.timestamp > before);
                !(mailbox.events.is_empty()
                    && mailbox.edition_map.is_empty()
                    && mailbox.preview_map.is_empty())
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
