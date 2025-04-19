use crate::channels::api::MemberWithUser;
use crate::channels::Channel;

use crate::events::context;
use crate::events::context::{EncodedUpdate, WAIT};
use crate::events::models::{space_users_status, StatusKind, UserStatus};
use crate::events::preview::{Preview, PreviewPost};
use crate::messages::Message;
use crate::spaces::api::SpaceWithRelated;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::spawn;
use tokio_tungstenite::tungstenite;
use uuid::Uuid;

pub type Seq = u16;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateQuery {
    pub mailbox: Uuid,
    #[serde(default)]
    pub token: Option<Uuid>,
    #[serde(default)]
    pub after: Option<i64>,
    #[serde(default)]
    pub seq: Option<Seq>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE", tag = "type")]
pub enum ClientEvent {
    #[serde(rename_all = "camelCase")]
    Preview { preview: PreviewPost },
    #[serde(rename_all = "camelCase")]
    Status { kind: StatusKind, focus: Vec<Uuid> },
}

#[derive(Deserialize, Serialize, Debug, Copy, Clone, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ConnectionError {
    NotFound,
    NoPermission,
    InvalidToken,
    Unexpected,
}

#[derive(Serialize, Debug, Clone, specta::Type)]
#[serde(tag = "type")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UpdateBody {
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

#[derive(Serialize, Clone, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Update {
    pub mailbox: Uuid,
    pub id: EventId,
    pub body: UpdateBody,
}

impl Update {
    pub fn initialized(mailbox: Uuid) -> Update {
        Update {
            mailbox,
            id: EventId::new(),
            body: UpdateBody::Initialized,
        }
    }

    pub fn encode(&self) -> tungstenite::Utf8Bytes {
        let serialized = serde_json::to_string(self).expect("Failed to encode update");
        let bytes = tungstenite::Bytes::from_owner(serialized);
        unsafe { tungstenite::Utf8Bytes::from_bytes_unchecked(bytes) }
    }

    pub fn error(mailbox: Uuid, code: ConnectionError, reason: String) -> Update {
        Update {
            mailbox,
            id: EventId::new(),
            body: UpdateBody::Error { code, reason },
        }
    }

    pub fn new_message(mailbox: Uuid, message: Message, preview_id: Option<Uuid>) {
        let channel_id = message.channel_id;
        let message = Box::new(message);
        Update::fire(
            UpdateBody::NewMessage {
                message,
                channel_id,
                preview_id,
            },
            mailbox,
        )
    }

    pub fn message_deleted(mailbox: Uuid, channel_id: Uuid, message_id: Uuid, pos: f64) {
        Update::fire(
            UpdateBody::MessageDeleted {
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
        Update::fire(
            UpdateBody::MessageEdited {
                message,
                channel_id,
                old_pos,
            },
            mailbox,
        )
    }

    pub fn channel_deleted(mailbox: Uuid, channel_id: Uuid) {
        Update::transient(mailbox, UpdateBody::ChannelDeleted { channel_id })
    }

    pub fn message_preview(mailbox: Uuid, preview: Box<Preview>) {
        let channel_id = preview.channel_id;
        Update::fire(
            UpdateBody::MessagePreview {
                preview,
                channel_id,
            },
            mailbox,
        );
    }
    pub async fn push_status(space_id: Uuid) -> Result<(), anyhow::Error> {
        let status_map = space_users_status(space_id).await;
        if let Some(status_map) = status_map {
            Update::transient(
                space_id,
                UpdateBody::StatusMap {
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

        let old_value = {
            let map = super::context::store().mailboxes.pin();
            let Some(mailbox_state) = map.get(&space_id) else {
                // It's ok if the mailbox is not be created yet

                return Ok(());
            };
            let Some(mut status) = mailbox_state.status.try_lock() else {
                log::info!(
                    "Failed to lock mailbox for space {} on update status",
                    space_id
                );
                return Ok(());
            };

            status.insert(user_id, heartbeat)
        };
        if let Some(old_value) = old_value {
            if old_value.kind != kind {
                Update::push_status(space_id).await?;
            }
        } else {
            Update::push_status(space_id).await?;
        }
        Ok(())
    }

    pub fn push_members(space_id: Uuid, channel_id: Uuid, members: Vec<MemberWithUser>) {
        spawn(async move {
            if let Err(e) = Update::fire_members(space_id, channel_id, members).await {
                log::warn!("Failed to fetch member list: {}", e);
            }
        });
    }

    pub fn channel_edited(channel: Channel) {
        let space_id = channel.space_id;
        let channel_id = channel.id;
        Update::transient(
            space_id,
            UpdateBody::ChannelEdited {
                channel,
                channel_id,
            },
        )
    }

    pub fn get_from_cache(
        mailbox_id: &Uuid,
        after: Option<i64>,
        seq: Option<Seq>,
    ) -> Option<Vec<tungstenite::Utf8Bytes>> {
        use std::cmp::Ordering;
        let after = after.unwrap_or(i64::MIN);
        let mut updates: Vec<Arc<EncodedUpdate>> = {
            let map = super::context::store().mailboxes.pin();
            let Some(mailbox_state) = map.get(mailbox_id) else {
                return Some(vec![]);
            };
            let mut updates: Vec<Arc<EncodedUpdate>> = {
                let updates_lock = mailbox_state.updates.try_lock_for(WAIT);
                if let Some(updates_lock) = updates_lock {
                    updates_lock.iter().cloned().collect()
                } else {
                    log::error!(
                        "Failed to lock updates for space {} on get_from_cache",
                        mailbox_id
                    );
                    return None;
                }
            };
            {
                let preview_map = mailbox_state.preview_map.pin();
                updates.extend(preview_map.values().cloned());
            }
            updates
        };
        if updates.is_empty() {
            return Some(vec![]);
        }
        updates.sort_by(|a, b| a.update.id.cmp(&b.update.id));
        let mut prev_id: Option<EventId> = None;
        let mut encoded_updates: Vec<tungstenite::Utf8Bytes> = Vec::with_capacity(updates.len());
        for encoded_update in updates.into_iter() {
            let event_id = encoded_update.update.id;
            if let Some(prev_id) = prev_id {
                if event_id == prev_id {
                    log::error!("Duplicated update: {}", encoded_update.encoded);
                }
            }
            prev_id = Some(event_id);
            let cmp = event_id.timestamp.cmp(&after);
            let seq = seq.unwrap_or(Seq::MIN);
            if cmp == Ordering::Greater || (cmp == Ordering::Equal && event_id.seq > seq) {
                encoded_updates.push(encoded_update.encoded.clone());
            }
        }
        Some(encoded_updates)
    }

    pub fn space_updated(space_id: Uuid) {
        tokio::spawn(async move {
            match crate::spaces::handlers::space_related(&space_id).await {
                Ok(space_with_related) => {
                    let body = UpdateBody::SpaceUpdated { space_with_related };
                    Update::transient(space_id, body);
                }
                Err(e) => log::error!(
                    "There an error occurred while preparing the `space_updated` update: {}",
                    e
                ),
            }
        });
    }

    async fn send(mailbox: Uuid, update: Arc<EncodedUpdate>) {
        let table = context::get_broadcast_table().pin();
        if let Some(tx) = table.get(&mailbox) {
            tx.send(update).ok();
        }
    }

    async fn fire_members(
        space_id: Uuid,
        channel_id: Uuid,
        members: Vec<MemberWithUser>,
    ) -> Result<(), anyhow::Error> {
        let encoded_update = EncodedUpdate::new(Update {
            mailbox: space_id,
            body: UpdateBody::Members {
                members,
                channel_id,
            },
            id: EventId::new(),
        });

        Update::send(space_id, Arc::new(encoded_update)).await;
        Ok(())
    }

    fn build(body: UpdateBody, mailbox: Uuid) -> Arc<EncodedUpdate> {
        Arc::new(EncodedUpdate::new(Update {
            mailbox,
            body,
            id: EventId::new(),
        }))
    }

    async fn async_fire(body: UpdateBody, mailbox: Uuid) {
        let update = {
            let map = super::context::store().mailboxes.pin();
            let mailbox_state = map.get_or_insert_with(mailbox, Default::default);

            let encoded_update = Update::build(body, mailbox);
            mailbox_state.new_update(encoded_update)
        };

        Update::send(mailbox, update).await;
    }

    pub fn transient(mailbox: Uuid, body: UpdateBody) {
        spawn(async move {
            let update = Update::build(body, mailbox);
            Update::send(mailbox, update).await;
        });
    }

    pub fn fire(body: UpdateBody, mailbox: Uuid) {
        spawn(Update::async_fire(body, mailbox));
    }
}

#[derive(
    Debug, Clone, Copy, Deserialize, specta::Type, Ord, PartialOrd, Eq, PartialEq, Hash, Serialize,
)]
pub struct EventId {
    /// The timestamp in milliseconds
    /// The value will not exceed 2^53 - 1, which is safe for JavaScript
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
