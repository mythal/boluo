use crate::channels::api::MemberWithUser;
use crate::channels::Channel;

use crate::events::context;
use crate::events::context::SyncEvent;
use crate::events::models::{space_users_status, StatusKind, UserStatus};
use crate::events::preview::{Preview, PreviewPost};
use crate::messages::Message;
use crate::spaces::api::SpaceWithRelated;
use chrono::Utc;
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

#[derive(Deserialize, Serialize, Debug, Copy, Clone, PartialEq, Eq, TS)]
#[ts(export)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ConnectionError {
    NotFound,
    NoPermission,
    InvalidToken,
    Unexpected,
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
        pos: f64,
    },
    MessageEdited {
        #[serde(rename = "channelId")]
        channel_id: Uuid,
        message: Box<Message>,
        #[serde(rename = "oldPos")]
        old_pos: f64,
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
        members: Vec<MemberWithUser>,
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
        code: ConnectionError,
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

    pub fn error(mailbox: Uuid, code: ConnectionError, reason: String) -> Event {
        Event {
            mailbox,
            id: EventId::new(),
            body: EventBody::Error { code, reason },
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

    pub fn message_deleted(mailbox: Uuid, channel_id: Uuid, message_id: Uuid, pos: f64) {
        Event::fire(
            EventBody::MessageDeleted {
                message_id,
                channel_id,
                pos,
            },
            mailbox,
        )
    }

    pub fn message_edited(mailbox: Uuid, message: Message, old_pos: f64) {
        let channel_id = message.channel_id;
        let message = Box::new(message);
        Event::fire(
            EventBody::MessageEdited {
                message,
                channel_id,
                old_pos,
            },
            mailbox,
        )
    }

    pub fn channel_deleted(mailbox: Uuid, channel_id: Uuid) {
        Event::transient(mailbox, EventBody::ChannelDeleted { channel_id })
    }

    pub fn message_preview(mailbox: Uuid, preview: Box<Preview>) {
        let channel_id = preview.channel_id;
        Event::fire(
            EventBody::MessagePreview {
                preview,
                channel_id,
            },
            mailbox,
        );
    }
    pub async fn push_status(space_id: Uuid) -> Result<(), anyhow::Error> {
        let status_map = space_users_status(space_id).await;
        if let Some(status_map) = status_map {
            Event::transient(
                space_id,
                EventBody::StatusMap {
                    status_map,
                    space_id,
                },
            );
        }
        Ok(())
    }

    pub async fn status(
        space_id: Uuid,
        user_id: Uuid,
        kind: StatusKind,
        timestamp: i64,
        focus: Vec<Uuid>,
    ) -> Result<(), anyhow::Error> {
        let heartbeat = UserStatus {
            timestamp,
            kind,
            focus,
        };

        let Some(mailbox) = super::context::get_cache().try_mailbox(&space_id).await else {
            // It's ok if the mailbox is not be created yet
            return Ok(());
        };
        let Ok(mut mailbox) = mailbox.try_lock() else {
            log::info!(
                "Failed to lock mailbox for space {} on update status",
                space_id
            );
            return Ok(());
        };

        let old_value = mailbox.status.insert(user_id, heartbeat);
        drop(mailbox);
        if let Some(old_value) = old_value {
            if old_value.kind != kind {
                Event::push_status(space_id).await?;
            }
        } else {
            Event::push_status(space_id).await?;
        }
        Ok(())
    }

    pub fn push_members(space_id: Uuid, channel_id: Uuid, members: Vec<MemberWithUser>) {
        spawn(async move {
            if let Err(e) = Event::fire_members(space_id, channel_id, members).await {
                log::warn!("Failed to fetch member list: {}", e);
            }
        });
    }

    pub fn channel_edited(channel: Channel) {
        let space_id = channel.space_id;
        let channel_id = channel.id;
        Event::transient(
            space_id,
            EventBody::ChannelEdited {
                channel,
                channel_id,
            },
        )
    }

    pub async fn get_from_cache(
        mailbox: &Uuid,
        after: Option<i64>,
        seq: Option<Seq>,
    ) -> Vec<String> {
        use std::cmp::Ordering;
        let after = after.unwrap_or(i64::MIN);
        let mailbox = super::context::get_cache().try_mailbox(mailbox).await;
        let Some(mailbox) = mailbox else {
            return vec![];
        };
        let mailbox_state = mailbox.lock().await;
        let mut event_list: Vec<Arc<SyncEvent>> = mailbox_state
            .events
            .iter()
            .chain(mailbox_state.edition_map.values())
            .chain(mailbox_state.preview_map.values())
            .cloned()
            .collect();
        drop(mailbox_state);
        if event_list.is_empty() {
            return vec![];
        }
        event_list.sort_by(|a, b| a.event.id.cmp(&b.event.id));
        let mut prev_id: Option<EventId> = None;
        let mut encoded_events: Vec<String> = Vec::with_capacity(event_list.len());
        for event in event_list.into_iter() {
            let event_id = event.event.id;
            if let Some(prev_id) = prev_id {
                if event_id == prev_id {
                    log::error!("Duplicated event: {}", event.encoded);
                }
            }
            prev_id = Some(event_id);
            let cmp = event_id.timestamp.cmp(&after);
            let seq = seq.unwrap_or(Seq::MIN);
            if cmp == Ordering::Greater || (cmp == Ordering::Equal && event_id.seq > seq) {
                encoded_events.push(event.encoded.clone());
            }
        }
        encoded_events
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

    async fn fire_members(
        space_id: Uuid,
        channel_id: Uuid,
        members: Vec<MemberWithUser>,
    ) -> Result<(), anyhow::Error> {
        let event = SyncEvent::new(Event {
            mailbox: space_id,
            body: EventBody::Members {
                members,
                channel_id,
            },
            id: EventId::new(),
        });

        Event::send(space_id, Arc::new(event)).await;
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
        let mailbox_lock = super::context::get_cache().mailbox(&mailbox).await;
        let mut mailbox_state = mailbox_lock.lock().await;

        enum Kind {
            Preview { channel_id: Uuid, sender_id: Uuid },
            Edition { message_id: Uuid },
            NoCache,
            Cache,
        }
        let kind = match &body {
            EventBody::MessagePreview {
                preview,
                channel_id: _,
            } => Kind::Preview {
                sender_id: preview.sender_id,
                channel_id: preview.channel_id,
            },
            EventBody::MessageEdited {
                channel_id: _,
                message,
                old_pos: _,
            } => Kind::Edition {
                message_id: message.id,
            },
            EventBody::NewMessage {
                channel_id: _,
                message: _,
                preview_id: _,
            }
            | EventBody::MessageDeleted {
                message_id: _,
                channel_id: _,
                pos: _,
            } => Kind::Cache,
            _ => Kind::NoCache,
        };

        let event = Event::build(body, mailbox);
        match kind {
            Kind::Preview {
                sender_id,
                channel_id,
            } => {
                mailbox_state
                    .preview_map
                    .insert((sender_id, channel_id), event.clone());
            }
            Kind::Edition { message_id } => {
                mailbox_state.edition_map.insert(message_id, event.clone());
            }
            Kind::Cache => {
                mailbox_state.events.push_back(event.clone());
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
