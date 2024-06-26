use crate::channels::models::Member;
use crate::channels::Channel;

use crate::events::context;
use crate::events::context::SyncEvent;
use crate::events::preview::{Preview, PreviewPost};
use crate::messages::Message;
use crate::spaces::api::SpaceWithRelated;
use crate::spaces::models::{space_users_status, StatusKind, UserStatus};
use crate::{cache, db};
use chrono::Utc;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::spawn;
use ts_rs::TS;
use uuid::Uuid;

pub type Seq = u16;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EventQuery {
    pub mailbox: Uuid,
    #[serde(default)]
    pub token: Option<Uuid>,
    #[serde(default)]
    pub after: Option<i64>,
    #[serde(default)]
    pub seq: Option<Seq>,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE", tag = "type")]
pub enum ClientEvent {
    #[serde(rename_all = "camelCase")]
    Preview { preview: PreviewPost },
    #[serde(rename_all = "camelCase")]
    Status { kind: StatusKind, focus: Vec<Uuid> },
}

#[derive(Serialize, Debug, TS)]
#[ts(export)]
#[serde(tag = "type")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EventBody {
    // Workaround https://github.com/Aleph-Alpha/ts-rs/issues/72
    // #[serde(rename_all = "camelCase")]
    NewMessage {
        #[serde(rename = "channelId")]
        channel_id: Uuid,
        message: Box<Message>,
        #[serde(rename = "previewId")]
        preview_id: Option<Uuid>,
    },
    MessageDeleted {
        #[serde(rename = "messageId")]
        message_id: Uuid,
        #[serde(rename = "channelId")]
        channel_id: Uuid,
    },
    MessageEdited {
        #[serde(rename = "channelId")]
        channel_id: Uuid,
        message: Box<Message>,
    },
    MessagePreview {
        #[serde(rename = "channelId")]
        channel_id: Uuid,
        preview: Box<Preview>,
    },
    ChannelDeleted {
        #[serde(rename = "channelId")]
        channel_id: Uuid,
    },
    ChannelEdited {
        #[serde(rename = "channelId")]
        channel_id: Uuid,
        channel: Channel,
    },
    Members {
        #[serde(rename = "channelId")]
        channel_id: Uuid,
        members: Vec<Member>,
    },
    Batch {
        #[serde(rename = "encodedEvents")]
        encoded_events: Vec<String>,
    },
    Initialized,
    StatusMap {
        #[serde(rename = "statusMap")]
        status_map: HashMap<Uuid, UserStatus>,
        #[serde(rename = "spaceId")]
        space_id: Uuid,
    },
    SpaceUpdated {
        #[serde(rename = "spaceWithRelated")]
        space_with_related: SpaceWithRelated,
    },
    Error {
        reason: String,
    },
    AppUpdated {
        version: String,
    },
}

#[derive(Serialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub mailbox: Uuid,
    pub id: EventId,
    pub body: EventBody,
}

impl Event {
    pub fn initialized(mailbox: Uuid) -> Event {
        Event {
            mailbox,
            id: EventId::new(),
            body: EventBody::Initialized,
        }
    }

    pub fn batch(mailbox: Uuid, encoded_events: Vec<String>) -> Event {
        Event {
            mailbox,
            id: EventId::new(),
            // subsec: now.timestamp_subsec_millis(),
            body: EventBody::Batch { encoded_events },
        }
    }

    pub fn error(mailbox: Uuid, reason: String) -> Event {
        Event {
            mailbox,
            id: EventId::new(),
            body: EventBody::Error { reason },
        }
    }

    pub fn new_message(mailbox: Uuid, message: Message, preview_id: Option<Uuid>) {
        let channel_id = message.channel_id;
        let message = Box::new(message);
        Event::fire(
            EventBody::NewMessage {
                message,
                channel_id,
                preview_id,
            },
            mailbox,
        )
    }

    pub fn message_deleted(mailbox: Uuid, channel_id: Uuid, message_id: Uuid) {
        Event::fire(EventBody::MessageDeleted { message_id, channel_id }, mailbox)
    }

    pub fn message_edited(mailbox: Uuid, message: Message) {
        let channel_id = message.channel_id;
        let message = Box::new(message);
        Event::fire(EventBody::MessageEdited { message, channel_id }, mailbox)
    }

    pub fn channel_deleted(mailbox: Uuid, channel_id: Uuid) {
        Event::transient(mailbox, EventBody::ChannelDeleted { channel_id })
    }

    pub fn message_preview(mailbox: Uuid, preview: Box<Preview>) {
        let channel_id = preview.channel_id;
        Event::fire(EventBody::MessagePreview { preview, channel_id }, mailbox);
    }
    pub async fn push_status(cache: &mut crate::cache::Connection, space_id: Uuid) -> Result<(), anyhow::Error> {
        let status_map = space_users_status(cache, space_id).await?;
        Event::transient(space_id, EventBody::StatusMap { status_map, space_id });
        Ok(())
    }

    pub async fn status(
        space_id: Uuid,
        user_id: Uuid,
        kind: StatusKind,
        timestamp: i64,
        focus: Vec<Uuid>,
    ) -> Result<(), anyhow::Error> {
        let mut cache = cache::conn().await?;
        let heartbeat = UserStatus { timestamp, kind, focus };
        let mut changed = true;

        let key = cache::make_key(b"space", &space_id, b"heartbeat");
        let old_value: Option<Result<UserStatus, _>> = cache
            .inner
            .hget::<_, _, Option<Vec<u8>>>(&*key, user_id.as_bytes())
            .await?
            .as_deref()
            .map(serde_json::from_slice);
        if let Some(Ok(old_value)) = old_value {
            changed = old_value.kind != kind;
        }
        let value = serde_json::to_vec(&heartbeat)?;

        let created: bool = cache.inner.hset(&*key, user_id.as_bytes(), &*value).await?;
        if created || changed {
            Event::push_status(&mut cache, space_id).await?;
        }
        Ok(())
    }

    pub fn push_members(channel_id: Uuid) {
        spawn(async move {
            if let Err(e) = Event::fire_members(channel_id).await {
                log::warn!("Failed to fetch member list: {}", e);
            }
        });
    }

    pub fn channel_edited(channel: Channel) {
        let space_id = channel.space_id;
        let channel_id = channel.id;
        Event::transient(space_id, EventBody::ChannelEdited { channel, channel_id })
    }

    pub fn cache_key(mailbox: &Uuid) -> Vec<u8> {
        cache::make_key(b"mailbox", mailbox, b"events")
    }

    pub async fn get_from_cache(mailbox: &Uuid, after: Option<i64>, seq: Option<Seq>) -> Vec<String> {
        use std::cmp::Ordering;
        let after = after.unwrap_or(i64::MIN);
        let cache = super::context::get_cache().try_mailbox(mailbox).await;
        let Some(cache) = cache else { return vec![] };
        let cache = cache.lock().await;
        let mut event_list: Vec<&Arc<SyncEvent>> = cache
            .events
            .iter()
            .chain(cache.edition_map.values())
            .chain(cache.preview_map.values())
            .collect();
        event_list.sort_by(|a, b| a.event.id.cmp(&b.event.id));
        event_list
            .into_iter()
            .skip_while(|e| match e.event.id.timestamp.cmp(&after) {
                Ordering::Less => true,
                Ordering::Greater => false,
                Ordering::Equal => {
                    let Some(seq) = seq else { return false };
                    e.event.id.seq <= seq
                }
            })
            .map(|e| e.encoded.clone())
            .collect()
    }

    pub fn space_updated(space_id: Uuid) {
        tokio::spawn(async move {
            match crate::spaces::handlers::space_related(&space_id).await {
                Ok(space_with_related) => {
                    let body = EventBody::SpaceUpdated { space_with_related };
                    Event::transient(space_id, body);
                }
                Err(e) => log::error!(
                    "There an error occurred while preparing the `space_updated` event: {}",
                    e
                ),
            }
        });
    }

    async fn send(mailbox: Uuid, event: Arc<SyncEvent>) {
        let broadcast_table = context::get_broadcast_table();
        let table = broadcast_table.read().await;
        if let Some(tx) = table.get(&mailbox) {
            tx.send(event).ok();
        }
    }

    async fn fire_members(channel_id: Uuid) -> Result<(), anyhow::Error> {
        let pool = db::get().await;
        let mut conn = pool.acquire().await?;
        let channel = Channel::get_by_id(&mut *conn, &channel_id)
            .await?
            .ok_or(anyhow::anyhow!("channel not found"))?;
        let members = Member::get_by_channel(&mut *conn, channel_id).await?;
        drop(conn);
        let event = SyncEvent::new(Event {
            mailbox: channel.space_id,
            body: EventBody::Members { members, channel_id },
            id: EventId::new(),
        });

        Event::send(channel.space_id, Arc::new(event)).await;
        Ok(())
    }

    fn build(body: EventBody, mailbox: Uuid) -> Arc<SyncEvent> {
        Arc::new(SyncEvent::new(Event {
            mailbox,
            body,
            id: EventId::new(),
        }))
    }

    async fn async_fire(body: EventBody, mailbox: Uuid) {
        let cache = super::context::get_cache().mailbox(&mailbox).await;
        let mut cache = cache.lock().await;

        enum Kind {
            Preview { channel_id: Uuid, sender_id: Uuid },
            Edition { message_id: Uuid },
            NoCache,
            Cache,
        }
        let kind = match &body {
            EventBody::MessagePreview { preview, channel_id: _ } => Kind::Preview {
                sender_id: preview.sender_id,
                channel_id: preview.channel_id,
            },
            EventBody::MessageEdited { channel_id: _, message } => Kind::Edition { message_id: message.id },
            EventBody::NewMessage {
                channel_id: _,
                message: _,
                preview_id: _,
            }
            | EventBody::MessageDeleted {
                message_id: _,
                channel_id: _,
            } => Kind::Cache,
            _ => Kind::NoCache,
        };

        let event = Event::build(body, mailbox);
        match kind {
            Kind::Preview { sender_id, channel_id } => {
                cache.preview_map.insert((sender_id, channel_id), event.clone());
            }
            Kind::Edition { message_id } => {
                cache.edition_map.insert(message_id, event.clone());
            }
            Kind::Cache => {
                cache.events.push_back(event.clone());
            }
            Kind::NoCache => {}
        }

        Event::send(mailbox, event).await;
    }

    pub fn transient(mailbox: Uuid, body: EventBody) {
        spawn(async move {
            let event = Event::build(body, mailbox);
            Event::send(mailbox, event).await;
        });
    }

    pub fn fire(body: EventBody, mailbox: Uuid) {
        spawn(Event::async_fire(body, mailbox));
    }
}

#[derive(Debug, Clone, Copy, Deserialize, TS, Ord, PartialOrd, Eq, PartialEq, Hash, Serialize)]
#[ts(export)]
pub struct EventId {
    /// The timestamp in milliseconds
    /// The value will not exceed 2^53 - 1, which is safe for JavaScript
    #[ts(type = "number")]
    pub timestamp: i64,
    /// Preserved for future use
    pub node: u16,
    pub seq: Seq,
}

impl EventId {
    pub fn new() -> EventId {
        use std::sync::atomic::{AtomicI64, AtomicU16, Ordering};
        static SEQUENCE: AtomicU16 = AtomicU16::new(Seq::MAX / 2);
        static PREV_TIMESTAMP: AtomicI64 = AtomicI64::new(0);

        let now = Utc::now();
        let mut timestamp = now.timestamp_millis();
        let seq = SEQUENCE.fetch_add(1, Ordering::SeqCst);

        if seq < Seq::MAX / 2 {
            // A wrap-around occurred
            timestamp += 1;
        }
        let prev_timestamp = PREV_TIMESTAMP.fetch_max(timestamp, Ordering::SeqCst);
        timestamp = prev_timestamp.max(timestamp);
        EventId {
            timestamp,
            node: 0,
            seq,
        }
    }
}

#[test]
fn test_event_id() {
    for _ in 0..10 {
        std::thread::spawn(|| {
            let mut prev_id = EventId::new();
            for _ in 0..1000000 {
                let id = EventId::new();
                assert!(id > prev_id);
                prev_id = id;
            }
        });
    }
}
