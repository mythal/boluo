use crate::channels::Channel;
use crate::channels::api::MemberWithUser;

use crate::error::AppError;
use crate::events::context::EncodedUpdate;
use crate::events::models::{StatusKind, UserStatus};
use crate::events::preview::{Preview, PreviewPost};
use crate::info::BasicInfo;
use crate::messages::Message;
use crate::spaces::api::SpaceWithRelated;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use std::sync::atomic::AtomicU32;
use tokio::spawn;
use tokio_tungstenite::tungstenite::{self, Utf8Bytes};
use tracing::Instrument as _;
use uuid::Uuid;

use super::status::StatusMap;

pub type Seq = u32;

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
    #[serde(default)]
    pub node: Option<u16>,
}

#[derive(Deserialize, Serialize, Debug, Copy, Clone, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ConnectionError {
    NotFound,
    NoPermission,
    InvalidToken,
    Unexpected,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE", tag = "type")]
pub enum ClientEvent {
    #[serde(rename_all = "camelCase")]
    Preview { preview: PreviewPost },
    #[serde(rename_all = "camelCase")]
    Status { kind: StatusKind, focus: Vec<Uuid> },
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
        channel: Box<Channel>,
    },
    Members {
        #[serde(rename = "channelId")]
        channel_id: Uuid,
        members: Vec<MemberWithUser>,
    },
    Initialized,
    StatusMap {
        #[serde(rename = "statusMap")]
        status_map: StatusMap,
        #[serde(rename = "spaceId")]
        space_id: Uuid,
    },
    SpaceUpdated {
        #[serde(rename = "spaceWithRelated")]
        space_with_related: Box<SpaceWithRelated>,
    },
    Error {
        code: ConnectionError,
        reason: String,
    },
    AppUpdated {
        version: String,
    },
    AppInfo {
        info: BasicInfo,
    },
}

impl UpdateBody {
    pub fn channel_id(&self) -> Option<Uuid> {
        use UpdateBody::*;
        match self {
            | NewMessage { channel_id, .. } => Some(*channel_id),
            | MessageDeleted { channel_id, .. } => Some(*channel_id),
            | MessageEdited { channel_id, .. } => Some(*channel_id),
            | MessagePreview { channel_id, .. } => Some(*channel_id),
            | ChannelEdited { channel_id, .. } => Some(*channel_id),
            | Members { channel_id, .. } => Some(*channel_id),
            | ChannelDeleted { channel_id } => Some(*channel_id),

            | Initialized
            | StatusMap { .. }
            | SpaceUpdated { .. }
            | Error { .. }
            | AppUpdated { .. }
            | AppInfo { .. } => None,
        }
    }

    pub fn message_id(&self) -> Option<Uuid> {
        use UpdateBody::*;
        match self {
            | NewMessage { message, .. } => Some(message.id),
            | MessageDeleted { message_id, .. } => Some(*message_id),
            | MessageEdited { message, .. } => Some(message.id),

            | MessagePreview { .. }
            | ChannelEdited { .. }
            | ChannelDeleted { .. }
            | Members { .. }
            | Initialized
            | StatusMap { .. }
            | SpaceUpdated { .. }
            | Error { .. }
            | AppUpdated { .. }
            | AppInfo { .. } => None,
        }
    }
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

    pub fn error(mailbox: Uuid, error: AppError) -> Update {
        let code = match error {
            AppError::NotFound(_) => ConnectionError::NotFound,
            AppError::NoPermission(_) => ConnectionError::NoPermission,
            AppError::Unauthenticated(_) => ConnectionError::InvalidToken,
            _ => ConnectionError::Unexpected,
        };
        Update {
            mailbox,
            id: EventId::new(),
            body: UpdateBody::Error {
                code,
                reason: error.to_string(),
            },
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

        let Some(mailbox_manager) = super::context::store().get_manager(&space_id) else {
            // It's ok if the mailbox is not be created yet
            return Ok(());
        };
        mailbox_manager.update_status(user_id, heartbeat)?;
        Ok(())
    }

    pub fn push_members(space_id: Uuid, channel_id: Uuid, members: Vec<MemberWithUser>) {
        let span =
            tracing::info_span!("push_members", space_id = %space_id, channel_id = %channel_id);
        spawn(
            async move {
                if let Err(e) = Update::fire_members(space_id, channel_id, members).await {
                    tracing::warn!("Failed to fetch member list: {}", e);
                }
            }
            .instrument(span),
        );
    }

    pub fn channel_edited(channel: Channel) {
        let space_id = channel.space_id;
        let channel_id = channel.id;
        Update::transient(
            space_id,
            UpdateBody::ChannelEdited {
                channel: Box::new(channel),
                channel_id,
            },
        )
    }

    pub async fn get_from_state(
        mailbox_id: &Uuid,
        after: Option<i64>,
        seq: Option<Seq>,
        node: Option<u16>,
    ) -> Option<Vec<tungstenite::Utf8Bytes>> {
        let after = after.unwrap_or(i64::MIN);
        let Some(manager) = super::context::store().get_manager(mailbox_id) else {
            return Some(vec![]);
        };
        let updates_receiver = match manager.query_encoded_updates().await {
            Ok(receiver) => receiver,
            Err(err) => {
                tracing::error!(error = ?err, "Failed to query updates for mailbox {}", mailbox_id);
                return None;
            }
        };
        let updates = match updates_receiver.await {
            Ok(updates) => updates,
            Err(err) => {
                tracing::error!(error = ?err, "Failed to receive updates for mailbox {}", mailbox_id);
                return None;
            }
        };
        if updates.is_empty() {
            return Some(vec![]);
        }
        let node = node.unwrap_or(0);
        let mut encoded_updates: Vec<tungstenite::Utf8Bytes> = Vec::with_capacity(updates.len());
        for (event_id, encoded_update) in updates.into_iter() {
            use std::cmp::Ordering::*;
            match event_id.timestamp.cmp(&after) {
                Less => continue,
                Equal => {
                    if node == event_id.node {
                        if let Some(seq) = seq {
                            if event_id.seq <= seq {
                                continue;
                            }
                        }
                    }
                }
                _ => {}
            }
            encoded_updates.push(encoded_update.clone());
        }
        Some(encoded_updates)
    }

    pub fn space_updated(space_id: Uuid) {
        let span = tracing::info_span!("space_updated", space_id = %space_id);
        spawn(
            async move {
                match crate::spaces::handlers::space_related(&space_id).await {
                    Ok(space_with_related) => {
                        let body = UpdateBody::SpaceUpdated {
                            space_with_related: Box::new(space_with_related),
                        };
                        Update::transient(space_id, body);
                    }
                    Err(e) => tracing::error!(
                        "There an error occurred while preparing the `space_updated` update: {}",
                        e
                    ),
                }
            }
            .instrument(span),
        );
    }

    pub fn app_info() -> Update {
        let info = BasicInfo::new();
        let body = UpdateBody::AppInfo { info };
        let mailbox = Uuid::nil();
        Update {
            mailbox,
            id: EventId::zero(),
            body,
        }
    }

    async fn send(mailbox: Uuid, update_encoded: Utf8Bytes) {
        let table = crate::events::get_broadcast_table().pin();
        if let Some(tx) = table.get(&mailbox) {
            tx.send(update_encoded).ok();
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

        Update::send(space_id, encoded_update.encoded.clone()).await;
        Ok(())
    }

    fn build(body: UpdateBody, mailbox: Uuid) -> Box<EncodedUpdate> {
        Box::new(EncodedUpdate::new(Update {
            mailbox,
            body,
            id: EventId::new(),
        }))
    }

    async fn async_fire(body: UpdateBody, mailbox_id: Uuid) {
        let encoded_update = Update::build(body, mailbox_id);
        let mailbox_manager = super::context::store().get_or_create_manager(mailbox_id);
        if let Err(e) = mailbox_manager.fire_update(encoded_update.clone()).await {
            tracing::error!("Failed to send update to mailbox {}: {}", mailbox_id, e);
            return;
        }
        Update::send(mailbox_id, encoded_update.encoded.clone()).await;
    }

    /// Directly send the update to the mailbox.
    ///
    /// This is used for transient updates that are not required to be persisted.
    pub fn transient(mailbox: Uuid, body: UpdateBody) {
        let span = tracing::info_span!("transient", mailbox = %mailbox);
        spawn(
            async move {
                let update = Update::build(body, mailbox);
                Update::send(mailbox, update.encoded.clone()).await;
            }
            .instrument(span),
        );
    }

    pub fn fire(body: UpdateBody, mailbox: Uuid) {
        let span = tracing::info_span!("fire", mailbox = %mailbox);
        spawn(Update::async_fire(body, mailbox).instrument(span));
    }
}

static STARTUP_ID: OnceLock<u16> = OnceLock::new();

#[derive(Serialize, Debug)]
struct StartupInfo {
    startup: u16,
    version: String,
    timestamp: i64,
    machine_id: String,
    private_ip: String,
}

pub async fn initialize_startup_id() -> u16 {
    use redis::AsyncCommands;

    let Some(mut redis) = crate::redis::conn().await else {
        tracing::info!("Redis is not available, assuming single node environment");
        return 0;
    };
    const NODE_ID_KEY: &str = "node:startup";
    let node_id_string: String = redis
        .incr(NODE_ID_KEY, 1)
        .await
        .expect("Failed to allocate startup id");
    let parsed = node_id_string.parse::<u16>();
    if let Ok(startup_id) = parsed {
        if startup_id > 0 {
            return startup_id;
        }
        tracing::warn!("Startup id is 0");
    } else {
        tracing::warn!(
            "Failed to parse startup id from redis, reset to 0. Redis value: {}",
            node_id_string
        );
    }
    let _: () = redis
        .set(NODE_ID_KEY, 0)
        .await
        .expect("Failed to reset startup id");
    let startup_id_string: String = redis
        .incr(NODE_ID_KEY, 1)
        .await
        .expect("Failed to allocate startup id");

    let startup_id = startup_id_string
        .parse::<u16>()
        .expect("Failed to parse startup id after reset");

    let node_info = StartupInfo {
        startup: startup_id,
        version: std::env::var("VERSION").unwrap_or_default(),
        timestamp: Utc::now().timestamp_millis(),
        machine_id: std::env::var("FLY_MACHINE_ID").unwrap_or_default(),
        private_ip: std::env::var("FLY_PRIVATE_IP").unwrap_or_default(),
    };
    let _: () = redis
        .set(
            format!("startup:{startup_id}:info"),
            serde_json::to_string(&node_info).expect("Failed to serialize startup info"),
        )
        .await
        .expect("Failed to save startup information");
    startup_id
}

pub fn startup_id() -> u16 {
    *STARTUP_ID.get_or_init(|| {
        if cfg!(test) {
            return 0;
        }

        match tokio::runtime::Handle::try_current() {
            Ok(handle) => tokio::task::block_in_place(|| handle.block_on(initialize_startup_id())),
            Err(_) => {
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .expect("Failed to create Tokio runtime");
                rt.block_on(initialize_startup_id())
            }
        }
    })
}

#[derive(
    Debug, Clone, Copy, Deserialize, specta::Type, Ord, PartialOrd, Eq, PartialEq, Hash, Serialize,
)]
pub struct EventId {
    /// The timestamp in milliseconds
    /// The value will not exceed 2^53 - 1, which is safe for JavaScript
    pub timestamp: i64,
    /// Every start up will allocate a new node id. 0 is reserved for single node
    /// environment or client.
    pub node: u16,
    pub seq: Seq,
}

impl EventId {
    pub fn zero() -> EventId {
        EventId {
            timestamp: 0,
            node: 0,
            seq: 0,
        }
    }
    pub fn new() -> EventId {
        use std::sync::atomic::{AtomicI64, Ordering};
        static SEQUENCE: AtomicU32 = AtomicU32::new(Seq::MAX / 2);
        static PREV_TIMESTAMP: AtomicI64 = AtomicI64::new(0);

        let now = Utc::now();
        let mut timestamp = now.timestamp_millis();
        let seq = SEQUENCE.fetch_add(1, Ordering::Relaxed);

        if seq < Seq::MAX / 2 {
            // A wrap-around occurred
            timestamp += 1;
        }
        let prev_timestamp = PREV_TIMESTAMP.fetch_max(timestamp, Ordering::SeqCst);
        timestamp = prev_timestamp.max(timestamp);
        EventId {
            timestamp,
            node: startup_id(),
            seq,
        }
    }
}

#[test]
fn test_event_id_concurrent() {
    use std::sync::{Arc, Barrier};

    let thread_count = 8;
    let ids_per_thread = 10_000;

    let barrier = Arc::new(Barrier::new(thread_count));

    let mut handles = Vec::with_capacity(thread_count);

    for _ in 0..thread_count {
        let barrier_clone = Arc::clone(&barrier);
        let handle = std::thread::spawn(move || {
            let mut thread_ids = Vec::with_capacity(ids_per_thread);

            barrier_clone.wait();

            for _ in 0..ids_per_thread {
                thread_ids.push(EventId::new());
            }

            for i in 1..thread_ids.len() {
                assert!(thread_ids[i] > thread_ids[i - 1]);
            }

            thread_ids
        });

        handles.push(handle);
    }

    let mut all_ids = Vec::with_capacity(thread_count * ids_per_thread);
    for handle in handles {
        all_ids.extend(handle.join().unwrap());
    }

    all_ids.sort();
    for i in 1..all_ids.len() {
        assert!(all_ids[i] > all_ids[i - 1], "Event IDs are not unique");
    }
}

#[derive(Debug, Clone, Copy, Eq, PartialEq, Hash)]
pub struct ChannelUserId {
    pub channel_id: Uuid,
    pub user_id: Uuid,
}

impl ChannelUserId {
    pub fn new(channel_id: Uuid, user_id: Uuid) -> Self {
        ChannelUserId {
            channel_id,
            user_id,
        }
    }
}
