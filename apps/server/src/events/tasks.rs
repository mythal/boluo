use crate::events::context::{get_broadcast_table, get_heartbeat_map};
use crate::events::Event;
use crate::spaces::Space;
use crate::utils::timestamp;
use crate::{cache, database};
use futures::StreamExt;
use std::collections::HashMap;
use std::mem::swap;
use std::time::Duration;
use tokio::time::interval;
use tokio_stream::wrappers::IntervalStream;
use uuid::Uuid;

pub fn start() {
    tokio::spawn(events_clean());
    tokio::spawn(heartbeat_clean());
    tokio::spawn(broadcast_clean());
    tokio::spawn(push_status());
}

async fn push_status() {
    IntervalStream::new(interval(Duration::from_secs(4)))
        .for_each(|_| async {
            let spaces = match database::get().await {
                Ok(mut db) => match Space::all(&mut *db).await {
                    Ok(all_space) => all_space.into_iter().map(|space| space.id).collect(),
                    _ => vec![],
                },
                _ => vec![],
            };

            let mut cache = cache::conn().await;
            for space_id in spaces {
                Event::push_status(&mut cache, space_id).await.ok();
            }
        })
        .await;
}

async fn events_clean() {
    IntervalStream::new(interval(Duration::from_secs(60 * 60 * 2)))
        .for_each(|_| async {
            let mut next_map = HashMap::new();
            let before = timestamp() - 24 * 60 * 60 * 1000;
            let cache = super::context::get_cache().mailboxes.read().await;
            for (id, mailbox) in cache.iter() {
                let mut empty = false;
                {
                    let mut mailbox = mailbox.lock().await;
                    while let Some(event) = mailbox.events.pop_front() {
                        if event.event.timestamp > before {
                            mailbox.events.push_front(event);
                            break;
                        }
                    }
                    let mut preview_map = HashMap::new();
                    let mut edition_map = HashMap::new();
                    swap(&mut preview_map, &mut mailbox.preview_map);
                    swap(&mut edition_map, &mut mailbox.edition_map);
                    mailbox.preview_map = preview_map
                        .into_iter()
                        .filter(|(_, preview)| preview.event.timestamp > before)
                        .collect();
                    mailbox.edition_map = edition_map
                        .into_iter()
                        .filter(|(_, edition)| edition.event.timestamp > before)
                        .collect();
                    mailbox.start_at = before;
                    if mailbox.events.is_empty() && mailbox.edition_map.is_empty() && mailbox.preview_map.is_empty() {
                        empty = true;
                    }
                }
                if !empty {
                    next_map.insert(*id, mailbox.clone());
                }
            }
            drop(cache);
            let mut cache = super::context::get_cache().mailboxes.write().await;
            swap(&mut next_map, &mut *cache);
        })
        .await;
}

async fn heartbeat_clean() {
    IntervalStream::new(interval(Duration::from_secs(60 * 30)))
        .for_each(|_| async {
            let now = timestamp();
            let mut map_ref = get_heartbeat_map().lock().await;
            let mut map = HashMap::new();
            let hour = 1000 * 60 * 60;
            std::mem::swap(&mut map, &mut *map_ref);
            for (channel_id, heartbeat_map) in map.into_iter() {
                let heartbeat_map: HashMap<Uuid, i64> = heartbeat_map
                    .into_iter()
                    .filter(|(_, time)| now - *time < hour)
                    .collect();
                if !heartbeat_map.is_empty() {
                    map_ref.insert(channel_id, heartbeat_map);
                }
            }
        })
        .await;
}

async fn broadcast_clean() {
    IntervalStream::new(interval(Duration::from_secs(5 * 60)))
        .for_each(|_| async {
            let mut broadcast_table = get_broadcast_table().write().await;
            broadcast_table.retain(|_, v| v.receiver_count() != 0);
            drop(broadcast_table);
            log::trace!("clean finished");
        })
        .await;
}
