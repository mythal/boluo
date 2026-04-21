use crate::channels::ChannelMember;
use crate::channels::models::Member;
use crate::events::models::UserStatus;
use crate::events::status::StatusAction;
use crate::events::types::{ChannelUserId, Seq, UpdateBody, UpdateLifetime};
use crate::events::{StatusMap, Update};
use crate::spaces::SpaceMember;
use crate::utils::timestamp;
use std::collections::BTreeMap;
use std::sync::OnceLock as OnceCell;
use std::time::Instant;
use tokio::sync::mpsc::error::TrySendError;
use tokio_tungstenite::tungstenite::Utf8Bytes;
use tracing::Instrument;
use uuid::Uuid;

use super::types::EventId;

mod members;
mod members_actor;

pub use self::members::{
    Action as MembersAction, MemberQueryResult, MembersQueryResult, NotFullyLoaded,
};
use self::members_actor::MembersCommand;

#[derive(Debug, Clone)]
pub struct EncodedUpdate {
    pub update: Update,
    pub encoded: Utf8Bytes,
}

impl EncodedUpdate {
    pub fn new(update: Update) -> EncodedUpdate {
        let encoded = update.encode();
        EncodedUpdate { encoded, update }
    }
}

#[derive(Debug, Clone)]
enum StoredUpdateMeta {
    MessageEdited {
        channel_id: Uuid,
        message_id: Uuid,
        modified_us: i64,
        old_pos: f64,
    },
    MessageWithPreview {
        key: ChannelUserId,
        preview_id: Option<Uuid>,
        channel_id: Uuid,
        message_id: Uuid,
    },
    ChannelDeleted {
        channel_id: Uuid,
    },
    ChannelAndMessage {
        channel_id: Uuid,
        message_id: Uuid,
    },
    Other {
        channel_id: Option<Uuid>,
        message_id: Option<Uuid>,
    },
}

#[derive(Debug, Clone)]
struct StoredUpdate {
    encoded: Utf8Bytes,
    meta: StoredUpdateMeta,
}

#[derive(Debug, Clone)]
struct StoredPreview {
    id: EventId,
    encoded: Utf8Bytes,
    preview_id: Uuid,
    preview_version: u16,
}

#[derive(Debug, Clone)]
struct StoredDiff {
    id: EventId,
    encoded: Utf8Bytes,
    preview_id: Uuid,
    preview_version: u16,
    diff_version: u16,
}

impl StoredUpdateMeta {
    fn from_persistent_body(body: &UpdateBody) -> StoredUpdateMeta {
        use UpdateBody::*;
        match body {
            NewMessage {
                channel_id,
                message,
                preview_id,
            } => StoredUpdateMeta::MessageWithPreview {
                key: ChannelUserId::new(*channel_id, message.sender_id),
                preview_id: *preview_id,
                channel_id: *channel_id,
                message_id: message.id,
            },
            MessageDeleted {
                message_id,
                channel_id,
                ..
            } => StoredUpdateMeta::ChannelAndMessage {
                channel_id: *channel_id,
                message_id: *message_id,
            },
            MessageEdited {
                channel_id,
                message,
                old_pos,
            } => StoredUpdateMeta::MessageEdited {
                channel_id: *channel_id,
                message_id: message.id,
                modified_us: message.modified.timestamp_micros(),
                old_pos: *old_pos,
            },
            ChannelDeleted { channel_id } => StoredUpdateMeta::ChannelDeleted {
                channel_id: *channel_id,
            },
            _ => StoredUpdateMeta::Other {
                channel_id: body.channel_id(),
                message_id: body.message_id(),
            },
        }
    }
}

impl StoredUpdate {
    fn from_encoded_update(encoded_update: EncodedUpdate) -> Self {
        let meta = StoredUpdateMeta::from_persistent_body(&encoded_update.update.body);
        StoredUpdate {
            encoded: encoded_update.encoded,
            meta,
        }
    }

    fn channel_id(&self) -> Option<Uuid> {
        match &self.meta {
            StoredUpdateMeta::MessageEdited { channel_id, .. } => Some(*channel_id),
            StoredUpdateMeta::MessageWithPreview { channel_id, .. } => Some(*channel_id),
            StoredUpdateMeta::ChannelDeleted { channel_id } => Some(*channel_id),
            StoredUpdateMeta::ChannelAndMessage { channel_id, .. } => Some(*channel_id),
            StoredUpdateMeta::Other { channel_id, .. } => *channel_id,
        }
    }

    fn message_id(&self) -> Option<Uuid> {
        match &self.meta {
            StoredUpdateMeta::MessageEdited { message_id, .. } => Some(*message_id),
            StoredUpdateMeta::MessageWithPreview { message_id, .. } => Some(*message_id),
            StoredUpdateMeta::ChannelAndMessage { message_id, .. } => Some(*message_id),
            StoredUpdateMeta::Other { message_id, .. } => *message_id,
            StoredUpdateMeta::ChannelDeleted { .. } => None,
        }
    }
}

pub enum Action {
    Query {
        after: Option<i64>,
        seq: Option<Seq>,
        node: Option<u16>,
        respond_to: tokio::sync::oneshot::Sender<CachedUpdates>,
    },
    Update {
        body: UpdateBody,
        live: UpdateLifetime,
    },
    Status(super::status::StatusAction),
    TouchActivity,
}

const MAILBOX_STATE_WRITE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(16);
const MAILBOX_STATE_READ_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(2);

#[derive(Clone)]
pub struct MailboxManager {
    pub id: Uuid,
    sender: tokio::sync::mpsc::Sender<Action>,
    members_sender: tokio::sync::mpsc::Sender<MembersCommand>,
}

impl MailboxManager {
    fn new(
        id: Uuid,
        sender: tokio::sync::mpsc::Sender<Action>,
        members_sender: tokio::sync::mpsc::Sender<MembersCommand>,
    ) -> Self {
        MailboxManager {
            id,
            sender,
            members_sender,
        }
    }

    async fn send_read_action(&self, action: Action) -> Result<(), MailboxManageError> {
        let action = match self.sender.try_send(action) {
            Ok(_) => return Ok(()),
            Err(TrySendError::Closed(_)) => return Err(MailboxManageError::Closed),
            Err(TrySendError::Full(action)) => {
                tracing::info!("MailboxManager::send_read_action: full");
                action
            }
        };
        tokio::time::timeout(MAILBOX_STATE_READ_TIMEOUT, self.sender.send(action))
            .await
            .map_err(|_| {
                tracing::warn!("MailboxManager::send_read_action: timeout");
                MailboxManageError::TimeOut
            })?
            .map_err(|_| {
                tracing::warn!("MailboxManager::send_read_action: closed");
                MailboxManageError::Closed
            })
    }

    async fn send_members_read_action(
        &self,
        action: MembersCommand,
    ) -> Result<(), MailboxManageError> {
        let action = match self.members_sender.try_send(action) {
            Ok(_) => return Ok(()),
            Err(TrySendError::Closed(_)) => return Err(MailboxManageError::Closed),
            Err(TrySendError::Full(action)) => {
                tracing::info!("MailboxManager::send_members_read_action: full");
                action
            }
        };
        tokio::time::timeout(MAILBOX_STATE_READ_TIMEOUT, self.members_sender.send(action))
            .await
            .map_err(|_| {
                tracing::warn!("MailboxManager::send_members_read_action: timeout");
                MailboxManageError::TimeOut
            })?
            .map_err(|_| {
                tracing::warn!("MailboxManager::send_members_read_action: closed");
                MailboxManageError::Closed
            })
    }

    async fn send_write_action(&self, action: Action) -> Result<(), MailboxManageError> {
        let action = match self.sender.try_send(action) {
            Ok(_) => return Ok(()),
            Err(TrySendError::Closed(_)) => return Err(MailboxManageError::Closed),
            Err(TrySendError::Full(action)) => {
                tracing::info!("MailboxManager::send_write_action: full");
                action
            }
        };
        tokio::time::timeout(MAILBOX_STATE_WRITE_TIMEOUT, self.sender.send(action))
            .await
            .map_err(|_| {
                tracing::warn!("MailboxManager::send_write_action: timeout");
                MailboxManageError::TimeOut
            })?
            .map_err(|_| {
                tracing::warn!("MailboxManager::send_write_action: closed");
                MailboxManageError::Closed
            })
    }

    async fn send_members_write_action(
        &self,
        action: MembersCommand,
    ) -> Result<(), MailboxManageError> {
        let action = match self.members_sender.try_send(action) {
            Ok(_) => return Ok(()),
            Err(TrySendError::Closed(_)) => return Err(MailboxManageError::Closed),
            Err(TrySendError::Full(action)) => {
                tracing::info!("MailboxManager::send_members_write_action: full");
                action
            }
        };
        tokio::time::timeout(
            MAILBOX_STATE_WRITE_TIMEOUT,
            self.members_sender.send(action),
        )
        .await
        .map_err(|_| {
            tracing::warn!("MailboxManager::send_members_write_action: timeout");
            MailboxManageError::TimeOut
        })?
        .map_err(|_| {
            tracing::warn!("MailboxManager::send_members_write_action: closed");
            MailboxManageError::Closed
        })
    }

    pub async fn get_members_in_channel(
        &self,
        channel_id: Uuid,
    ) -> Result<MembersQueryResult, MailboxManageError> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let action = MembersCommand::Action(MembersAction::QueryByChannel(channel_id, tx));
        self.send_members_read_action(action).await?;
        rx.await.map_err(|_| MailboxManageError::Closed)
    }

    pub async fn set_members(
        &self,
        channel_id: Uuid,
        members: Vec<Member>,
    ) -> Result<(), MailboxManageError> {
        let action = MembersCommand::Action(MembersAction::UpdateByMembers {
            channel_id,
            members,
        });
        self.send_members_write_action(action).await?;
        Ok(())
    }

    pub async fn remove_channel(&self, channel_id: Uuid) -> Result<(), MailboxManageError> {
        let action = MembersCommand::Action(MembersAction::RemoveChannel(channel_id));
        self.send_members_write_action(action).await?;
        Ok(())
    }

    pub async fn get_member(
        &self,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Result<MemberQueryResult, MailboxManageError> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let action = MembersCommand::Action(MembersAction::QueryByChannelUser(
            ChannelUserId::new(channel_id, user_id),
            tx,
        ));
        self.send_members_read_action(action).await?;
        rx.await.map_err(|_| MailboxManageError::Closed)
    }

    pub async fn is_master(
        &self,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Result<Result<bool, NotFullyLoaded>, MailboxManageError> {
        let member = self.get_member(channel_id, user_id).await?;
        Ok(member.map(|member| {
            member
                .map(|member| member.channel.is_master)
                .unwrap_or(false)
        }))
    }

    pub async fn update_channel_member(
        &self,
        channel_member: ChannelMember,
    ) -> Result<(), MailboxManageError> {
        let action = MembersCommand::Action(MembersAction::UpdateChannelMember(channel_member));
        self.send_members_write_action(action).await
    }

    pub async fn update_space_member(
        &self,
        space_member: SpaceMember,
    ) -> Result<(), MailboxManageError> {
        let action = MembersCommand::Action(MembersAction::UpdateSpaceMember(space_member));
        self.send_members_write_action(action).await
    }

    pub async fn remove_member(&self, user_id: &Uuid) -> Result<(), MailboxManageError> {
        let action = MembersCommand::Action(MembersAction::RemoveUser(*user_id));
        self.send_members_write_action(action).await
    }

    pub async fn remove_member_from_channel(
        &self,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), MailboxManageError> {
        let channel_user_id = ChannelUserId::new(channel_id, user_id);
        let action = MembersCommand::Action(MembersAction::RemoveFromChannel(channel_user_id));
        self.send_members_write_action(action).await
    }

    pub async fn query_encoded_updates(
        &self,
        after: Option<i64>,
        seq: Option<Seq>,
        node: Option<u16>,
    ) -> Result<tokio::sync::oneshot::Receiver<CachedUpdates>, MailboxManageError> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let action = Action::Query {
            after,
            seq,
            node,
            respond_to: tx,
        };
        self.send_read_action(action).await?;
        Ok(rx)
    }

    pub async fn fire_update(
        &self,
        body: UpdateBody,
        live: UpdateLifetime,
    ) -> Result<(), MailboxManageError> {
        let action = Action::Update { body, live };
        self.send_write_action(action).await
    }

    pub async fn query_status(&self) -> Result<StatusMap, MailboxManageError> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let action = Action::Status(StatusAction::Query(tx));
        self.send_read_action(action).await?;
        rx.await.map_err(|_| MailboxManageError::Closed)
    }

    pub fn update_status(
        &self,
        user_id: Uuid,
        status: UserStatus,
    ) -> Result<(), MailboxManageError> {
        let action = Action::Status(StatusAction::Update(user_id, status));
        if let Err(TrySendError::Closed(_)) = self.sender.try_send(action) {
            return Err(MailboxManageError::Closed);
        }
        Ok(())
    }

    pub fn touch_activity(&self) -> Result<(), MailboxManageError> {
        let action = Action::TouchActivity;
        match self.sender.try_send(action) {
            Ok(_) => Ok(()),
            Err(TrySendError::Closed(_)) => Err(MailboxManageError::Closed),
            Err(TrySendError::Full(_)) => Ok(()),
        }
    }

    pub async fn refresh_members_if_needed(
        &self,
        channel_id: Uuid,
    ) -> Result<(), MailboxManageError> {
        let action = MembersCommand::Refresh { channel_id };
        self.send_members_write_action(action).await
    }
}

pub struct CachedUpdates {
    pub updates: Vec<Utf8Bytes>,
    pub start_at: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum MailboxManageError {
    #[error("Channel closed")]
    Closed,
    #[error("Timeout")]
    TimeOut,
}

impl From<tokio::sync::mpsc::error::SendError<Action>> for MailboxManageError {
    fn from(_: tokio::sync::mpsc::error::SendError<Action>) -> Self {
        MailboxManageError::Closed
    }
}

pub struct MailBoxState {
    pub id: Uuid,
    manager: MailboxManager,
}

type PreviewMap = std::collections::HashMap<ChannelUserId, StoredPreview, ahash::RandomState>;
type DiffMap = std::collections::HashMap<ChannelUserId, StoredDiff, ahash::RandomState>;

fn prepare_message_edited_old_pos(
    persistent_updates: &BTreeMap<EventId, StoredUpdate>,
    body: &mut UpdateBody,
) -> Option<EventId> {
    use UpdateBody::MessageEdited;

    let MessageEdited {
        channel_id,
        message,
        old_pos,
    } = body
    else {
        return None;
    };

    let channel_id = *channel_id;
    let message_id = message.id;
    let modified_us = message.modified.timestamp_micros();

    let mut prev_event_id_and_old_pos: Option<(EventId, f64)> = None;
    for (stored_update_id, stored_update) in persistent_updates.iter().rev() {
        let StoredUpdateMeta::MessageEdited {
            channel_id: old_channel_id,
            message_id: old_message_id,
            modified_us: old_modified_us,
            old_pos: previous_old_pos,
        } = &stored_update.meta
        else {
            continue;
        };
        if *old_message_id == message_id
            && *old_channel_id == channel_id
            && *old_modified_us < modified_us
        {
            prev_event_id_and_old_pos = Some((*stored_update_id, *previous_old_pos));
            break;
        }
    }

    if let Some((prev_event_id, previous_old_pos)) = prev_event_id_and_old_pos {
        if previous_old_pos != *old_pos {
            *old_pos = previous_old_pos;
        }
        return Some(prev_event_id);
    }
    None
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum OnUpdateResult {
    Broadcast,
    SkipBroadcast,
}

impl OnUpdateResult {
    fn should_broadcast(self) -> bool {
        matches!(self, OnUpdateResult::Broadcast)
    }
}

fn on_update(
    persistent_updates: &mut BTreeMap<EventId, StoredUpdate>,
    preview_map: &mut PreviewMap,
    diff_map: &mut DiffMap,
    encoded_update: EncodedUpdate,
) -> OnUpdateResult {
    let EncodedUpdate { update, encoded } = encoded_update;
    let update_id = update.id;
    match update.body {
        UpdateBody::MessagePreview { preview, .. } => {
            let key = ChannelUserId::new(preview.channel_id, preview.sender_id);
            if let Some(existing_preview) = preview_map.get(&key) {
                if existing_preview.id >= update_id {
                    return OnUpdateResult::SkipBroadcast;
                }
            }
            if let Some(existing_diff) = diff_map.get(&key) {
                if existing_diff.preview_id != preview.id
                    || existing_diff.preview_version != preview.version
                {
                    diff_map.remove(&key);
                }
            }
            preview_map.insert(
                key,
                StoredPreview {
                    id: update_id,
                    encoded,
                    preview_id: preview.id,
                    preview_version: preview.version,
                },
            );
            OnUpdateResult::Broadcast
        }
        UpdateBody::Diff {
            channel_id, diff, ..
        } => {
            let key = ChannelUserId::new(channel_id, diff.sender);
            let Some(reference_preview) = preview_map.get(&key) else {
                return OnUpdateResult::SkipBroadcast;
            };
            if reference_preview.id >= update_id {
                return OnUpdateResult::SkipBroadcast;
            }
            if reference_preview.preview_id != diff.payload.id
                || reference_preview.preview_version != diff.payload.keyframe_version
            {
                return OnUpdateResult::SkipBroadcast;
            }
            if let Some(existing_diff) = diff_map.get(&key) {
                if existing_diff.preview_id == diff.payload.id
                    && existing_diff.preview_version == diff.payload.keyframe_version
                    && existing_diff.diff_version >= diff.payload.version
                {
                    return OnUpdateResult::SkipBroadcast;
                }
            }
            diff_map.insert(
                key,
                StoredDiff {
                    id: update_id,
                    encoded,
                    preview_id: diff.payload.id,
                    preview_version: diff.payload.keyframe_version,
                    diff_version: diff.payload.version,
                },
            );
            OnUpdateResult::Broadcast
        }
        body => {
            let stored = StoredUpdate {
                encoded,
                meta: StoredUpdateMeta::from_persistent_body(&body),
            };
            match &stored.meta {
                StoredUpdateMeta::MessageWithPreview {
                    key, preview_id, ..
                } => {
                    let key = *key;
                    let preview_id = *preview_id;
                    persistent_updates.insert(update_id, stored);
                    let preview_id = preview_id.unwrap_or_default();
                    if !preview_id.is_nil() {
                        if let Some(existing_preview) = preview_map.get(&key) {
                            if existing_preview.preview_id == preview_id {
                                preview_map.remove(&key);
                            }
                        }
                        if let Some(existing_diff) = diff_map.get(&key) {
                            if existing_diff.preview_id == preview_id {
                                diff_map.remove(&key);
                            }
                        }
                    }
                }
                StoredUpdateMeta::ChannelAndMessage { message_id, .. } => {
                    let message_id = *message_id;
                    persistent_updates.retain(|_, cached| cached.message_id() != Some(message_id));
                    persistent_updates.insert(update_id, stored);
                }
                StoredUpdateMeta::MessageEdited { .. } => {
                    persistent_updates.insert(update_id, stored);
                }
                StoredUpdateMeta::ChannelDeleted { channel_id } => {
                    let channel_id = *channel_id;
                    persistent_updates.retain(|_, cached| cached.channel_id() != Some(channel_id));
                    preview_map.retain(|key, _| key.channel_id != channel_id);
                    diff_map.retain(|key, _| key.channel_id != channel_id);
                }
                StoredUpdateMeta::Other { .. } => {
                    // Do nothing
                }
            }
            OnUpdateResult::Broadcast
        }
    }
}

fn cleanup(
    persistent_updates: &mut BTreeMap<EventId, StoredUpdate>,
    preview_map: &mut PreviewMap,
    diff_map: &mut DiffMap,
) -> Option<i64> {
    let now = timestamp();
    let mut has_been_cleaned = false;
    let mut last_removed_timestamp: Option<i64> = None;
    while persistent_updates.len() > 512 {
        if let Some((event_id, _)) = persistent_updates.pop_first() {
            last_removed_timestamp = Some(event_id.timestamp);
        }
        has_been_cleaned = true;
    }
    // Drop all persistent updates with the same timestamp as the last removed one, to avoid partial cleanup
    if let Some(removed_timestamp) = last_removed_timestamp {
        persistent_updates.retain(|event_id, _| event_id.timestamp != removed_timestamp);
    }
    let start_at = if has_been_cleaned {
        oldest_persistent_event_id(persistent_updates)
    } else {
        None
    };
    if has_been_cleaned {
        if let Some(start_at) = start_at {
            let age = now - start_at.timestamp;
            if age < 1000 * 60 * 30 {
                tracing::warn!(
                    start_at = start_at.timestamp,
                    age_s = age / 1000,
                    "Mailbox updates trimmed close to current time"
                );
            }
        }
    }
    preview_map.retain(|_, preview| {
        if let Some(start_at) = start_at
            && preview.id < start_at
        {
            return false;
        }
        let elapsed = now - preview.id.timestamp;
        elapsed < 1000 * 60 * 15 // 15 minutes
    });
    if preview_map.capacity() > 64 {
        let old_capacity = preview_map.capacity();
        preview_map.shrink_to_fit();
        tracing::info!(
            "Shrinking preview map from {} to {}",
            old_capacity,
            preview_map.capacity()
        );
    }
    diff_map.retain(|key, diff| {
        let Some(reference_preview) = preview_map.get(key) else {
            return false;
        };
        diff.preview_id == reference_preview.preview_id
            && diff.preview_version == reference_preview.preview_version
    });

    last_removed_timestamp.map(|removed_timestamp| removed_timestamp.saturating_add(1))
}

fn oldest_persistent_event_id(
    persistent_updates: &BTreeMap<EventId, StoredUpdate>,
) -> Option<EventId> {
    persistent_updates
        .first_key_value()
        .map(|(event_id, _)| *event_id)
}

fn cached_updates_start_at(persistent_updates: &BTreeMap<EventId, StoredUpdate>, floor: i64) -> i64 {
    oldest_persistent_event_id(persistent_updates)
        .map(|event_id| event_id.timestamp)
        .unwrap_or(floor)
        .max(floor)
}

fn should_include_update(
    event_id: EventId,
    after: Option<i64>,
    seq: Option<Seq>,
    node: u16,
) -> bool {
    use std::cmp::Ordering::*;

    let after = after.unwrap_or(i64::MIN);
    match event_id.timestamp.cmp(&after) {
        Less => false,
        Equal if node == event_id.node => seq.is_none_or(|seq| event_id.seq > seq),
        _ => true,
    }
}

fn collect_cached_updates(
    persistent_updates: &BTreeMap<EventId, StoredUpdate>,
    preview_map: &PreviewMap,
    diff_map: &DiffMap,
    after: Option<i64>,
    seq: Option<Seq>,
    node: Option<u16>,
) -> Vec<Utf8Bytes> {
    let node = node.unwrap_or(0);
    let mut response_updates: Vec<(EventId, Utf8Bytes)> =
        Vec::with_capacity(persistent_updates.len() + preview_map.len() + diff_map.len());
    response_updates.extend(
        persistent_updates
            .iter()
            .filter(|&(event_id, _)| should_include_update(*event_id, after, seq, node))
            .map(|(event_id, update)| (*event_id, update.encoded.clone())),
    );
    response_updates.extend(
        preview_map
            .values()
            .filter(|preview| should_include_update(preview.id, after, seq, node))
            .map(|preview| (preview.id, preview.encoded.clone())),
    );
    response_updates.extend(
        diff_map
            .values()
            .filter(|diff| should_include_update(diff.id, after, seq, node))
            .map(|diff| (diff.id, diff.encoded.clone())),
    );
    response_updates.sort_unstable_by_key(|(event_id, _)| *event_id);
    response_updates
        .into_iter()
        .map(|(_, encoded)| encoded)
        .collect()
}

impl MailBoxState {
    pub fn new(id: Uuid) -> Self {
        let (tx, mut rx) = tokio::sync::mpsc::channel::<Action>(1024);
        let members_sender = members_actor::spawn(id);
        let manager = MailboxManager::new(id, tx, members_sender.clone());
        let span = tracing::info_span!("MailboxState", mailbox_id = %id);
        tokio::spawn(async move {
            let members_sender = members_sender;
            let mut persistent_updates: BTreeMap<EventId, StoredUpdate> = BTreeMap::new();
            let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
            let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());
            let created_at = Instant::now();
            let mut last_event_at: Option<Instant> = None;
            let mut status_state = super::status::StatusState::new(id);
            let mut broadcast_status_interval = crate::utils::cleaner_interval(12);
            let mut cleanup_interval = crate::utils::cleaner_interval(120);
            let mut cursor_floor = i64::MIN;
            let mut last_pending_actions_warned = 0;
            let action_duration_histogram = metrics::histogram!("boluo_server_events_update_duration_ms");
            loop {
                tokio::select! {
                    Some(action) = rx.recv() => {
                        let pending = rx.len();
                        if pending > 256 && (pending - last_pending_actions_warned) > 8 {
                            tracing::info!(pending, mailbox_id = %id, "Too many pending actions");
                            last_pending_actions_warned = pending;
                        }
                        let start = std::time::Instant::now();
                        match action {
                            Action::Query { after, seq, node, respond_to } => {
                                let response_updates = collect_cached_updates(
                                    &persistent_updates,
                                    &preview_map,
                                    &diff_map,
                                    after,
                                    seq,
                                    node,
                                );
                                respond_to.send(CachedUpdates {
                                    updates: response_updates,
                                    start_at: cached_updates_start_at(
                                        &persistent_updates,
                                        cursor_floor,
                                    ),
                                }).ok();
                            }
                            Action::Update { body, live } => {
                                last_event_at = Some(Instant::now());
                                let _ = members_sender.try_send(MembersCommand::TouchActivity);
                                let mut body = body;
                                let stale_edited_event_id =
                                    prepare_message_edited_old_pos(&persistent_updates, &mut body);
                                let mailbox_id = id;
                                let encoded_update = match tokio::task::spawn_blocking(move || {
                                    EncodedUpdate::new(Update {
                                        mailbox: mailbox_id,
                                        body,
                                        id: EventId::new(),
                                        live,
                                    })
                                }).await {
                                    Ok(encoded_update) => encoded_update,
                                    Err(_) => {
                                        tracing::error!("Failed to build update");
                                        continue;
                                    }
                                };
                                if let Some(stale_edited_event_id) = stale_edited_event_id {
                                    persistent_updates.remove(&stale_edited_event_id);
                                }
                                let update_name = encoded_update.update.name();
                                let encoded_for_broadcast = encoded_update.encoded.clone();
                                let should_broadcast = on_update(
                                    &mut persistent_updates,
                                    &mut preview_map,
                                    &mut diff_map,
                                    encoded_update,
                                );
                                let elapsed = start.elapsed();
                                action_duration_histogram.record(elapsed.as_millis() as f64);
                                if elapsed > std::time::Duration::from_millis(25) {
                                    tracing::warn!(mailbox_id = %id, update_name, "Update took too long to process: {:?}", elapsed);
                                }
                                if should_broadcast.should_broadcast() {
                                    Update::send(id, encoded_for_broadcast).await;
                                }
                            }
                            Action::TouchActivity => {
                                last_event_at = Some(Instant::now());
                                let _ = members_sender.try_send(MembersCommand::TouchActivity);
                            }
                            Action::Status(action) => {
                                status_state.update(action);
                            }
                        }
                    }
                    _ = broadcast_status_interval.tick() => {
                        status_state.update(StatusAction::Broadcast);
                    }
                    _ = cleanup_interval.tick() => {
                        // If there are still actions to process, skip cleanup
                        if !rx.is_empty() {
                            continue;
                        }
                        let last_activity_at = last_event_at.unwrap_or(created_at);
                        if last_activity_at.elapsed() > std::time::Duration::from_secs(60 * 60 * 2) {
                            store().remove(id);
                            tracing::info!(mailbox_id = %id, "Mailbox state is idle, shutting down");
                            break;
                        } else {
                            let before_size = persistent_updates.len() + preview_map.len() + diff_map.len();
                            if let Some(new_floor) =
                                cleanup(&mut persistent_updates, &mut preview_map, &mut diff_map)
                            {
                                cursor_floor = cursor_floor.max(new_floor);
                            }
                            let after_size = persistent_updates.len() + preview_map.len() + diff_map.len();
                            if after_size != before_size {
                                tracing::info!(mailbox_id = %id, "Cleaned up {} updates", before_size - after_size);
                            }
                        }
                    }
                    _ = crate::shutdown::SHUTDOWN.notified() => {
                        break;
                    }
                    else => {
                        tracing::info!(mailbox_id = %id, "The channel is closed, shutting down");
                        break;
                    }
                }
            }
        }.instrument(span));

        MailBoxState { id, manager }
    }
}

pub struct Store {
    pub mailboxes: papaya::HashMap<Uuid, MailBoxState, ahash::RandomState>,
}

impl Store {
    fn new() -> Store {
        Store {
            mailboxes: papaya::HashMap::builder()
                .capacity(256)
                .hasher(ahash::RandomState::new())
                .resize_mode(papaya::ResizeMode::Blocking)
                .build(),
        }
    }

    pub fn get_manager(&self, id: &Uuid) -> Option<MailboxManager> {
        self.mailboxes
            .pin()
            .get(id)
            .map(|state| state.manager.clone())
    }

    pub fn get_or_create_manager(&self, id: Uuid) -> MailboxManager {
        self.mailboxes
            .pin()
            .get_or_insert_with(id, || {
                tracing::info!("Creating mailbox state for {}", id);
                MailBoxState::new(id)
            })
            .manager
            .clone()
    }

    pub fn mailbox_count(&self) -> usize {
        self.mailboxes.pin().len()
    }

    fn remove(&self, id: Uuid) {
        self.mailboxes.pin().remove(&id);
    }
}

static STORE: OnceCell<Store> = OnceCell::new();

pub fn store() -> &'static Store {
    STORE.get_or_init(Store::new)
}

pub fn mailbox_count() -> usize {
    store().mailbox_count()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event_id(timestamp: i64, node: u16, seq: Seq) -> EventId {
        EventId {
            timestamp,
            node,
            seq,
        }
    }

    fn encoded_update(id: EventId) -> EncodedUpdate {
        EncodedUpdate::new(Update {
            mailbox: Uuid::nil(),
            id,
            body: UpdateBody::Initialized,
            live: UpdateLifetime::Persistent,
        })
    }

    fn persistent_update(id: EventId) -> StoredUpdate {
        StoredUpdate::from_encoded_update(encoded_update(id))
    }

    #[test]
    fn cached_update_filter_matches_cursor_semantics() {
        let after = Some(10);
        let node = 1;
        let seq = Some(20);

        assert!(!should_include_update(event_id(9, 1, 99), after, seq, node));
        assert!(!should_include_update(
            event_id(10, 1, 20),
            after,
            seq,
            node
        ));
        assert!(should_include_update(event_id(10, 1, 21), after, seq, node));
        assert!(should_include_update(event_id(10, 0, 1), after, seq, node));
        assert!(should_include_update(event_id(11, 1, 0), after, seq, node));
    }

    #[test]
    fn collect_cached_updates_sorts_and_filters_all_sources() {
        let older = event_id(9, 1, 99);
        let from_updates = event_id(10, 1, 21);
        let from_preview = event_id(10, 0, 1);
        let from_diff = event_id(11, 1, 0);

        let older_update = persistent_update(older);
        let update = persistent_update(from_updates);
        let preview = StoredPreview {
            id: from_preview,
            encoded: encoded_update(from_preview).encoded,
            preview_id: Uuid::from_u128(100),
            preview_version: 1,
        };
        let diff = StoredDiff {
            id: from_diff,
            encoded: encoded_update(from_diff).encoded,
            preview_id: Uuid::from_u128(100),
            preview_version: 1,
            diff_version: 1,
        };

        let expected = vec![
            preview.encoded.clone(),
            update.encoded.clone(),
            diff.encoded.clone(),
        ];

        let mut persistent_updates = BTreeMap::new();
        persistent_updates.insert(older, older_update);
        persistent_updates.insert(from_updates, update);

        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        preview_map.insert(ChannelUserId::new(Uuid::nil(), Uuid::nil()), preview);

        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());
        diff_map.insert(ChannelUserId::new(Uuid::nil(), Uuid::from_u128(1)), diff);

        let actual = collect_cached_updates(
            &persistent_updates,
            &preview_map,
            &diff_map,
            Some(10),
            Some(20),
            Some(1),
        );
        assert_eq!(actual, expected);
    }

    #[test]
    fn on_update_keeps_higher_diff_version_for_same_keyframe() {
        let channel_id = Uuid::from_u128(200);
        let sender_id = Uuid::from_u128(201);
        let key = ChannelUserId::new(channel_id, sender_id);
        let preview_id = Uuid::from_u128(202);
        let preview_version = 1;
        let preview_event_id = event_id(100, 1, 1);
        let newer_diff_event_id = event_id(101, 1, 1);
        let older_diff_late_event_id = event_id(102, 1, 1);

        let mut persistent_updates = BTreeMap::new();
        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        preview_map.insert(
            key,
            StoredPreview {
                id: preview_event_id,
                encoded: Utf8Bytes::from_static("{\"type\":\"MESSAGE_PREVIEW\"}"),
                preview_id,
                preview_version,
            },
        );
        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());

        let newer_diff_update = EncodedUpdate::new(Update {
            mailbox: Uuid::nil(),
            id: newer_diff_event_id,
            body: UpdateBody::Diff {
                channel_id,
                diff: Box::new(crate::events::preview::PreviewDiff {
                    sender: sender_id,
                    payload: crate::events::preview::PreviewDiffPost {
                        channel_id,
                        id: preview_id,
                        keyframe_version: preview_version,
                        version: 3,
                        op: vec![],
                        entities: vec![],
                    },
                }),
            },
            live: UpdateLifetime::Volatile,
        });
        let first_should_broadcast = on_update(
            &mut persistent_updates,
            &mut preview_map,
            &mut diff_map,
            newer_diff_update,
        );
        assert_eq!(first_should_broadcast, OnUpdateResult::Broadcast);

        let older_diff_late_update = EncodedUpdate::new(Update {
            mailbox: Uuid::nil(),
            id: older_diff_late_event_id,
            body: UpdateBody::Diff {
                channel_id,
                diff: Box::new(crate::events::preview::PreviewDiff {
                    sender: sender_id,
                    payload: crate::events::preview::PreviewDiffPost {
                        channel_id,
                        id: preview_id,
                        keyframe_version: preview_version,
                        version: 2,
                        op: vec![],
                        entities: vec![],
                    },
                }),
            },
            live: UpdateLifetime::Volatile,
        });
        let second_should_broadcast = on_update(
            &mut persistent_updates,
            &mut preview_map,
            &mut diff_map,
            older_diff_late_update,
        );
        assert_eq!(second_should_broadcast, OnUpdateResult::SkipBroadcast);

        let Some(diff) = diff_map.get(&key) else {
            panic!("diff should be kept for the preview keyframe");
        };
        assert_eq!(diff.id, newer_diff_event_id);
        assert_eq!(diff.diff_version, 3);
    }

    #[test]
    fn on_update_rejects_diff_without_reference_preview_for_broadcast() {
        let channel_id = Uuid::from_u128(210);
        let sender_id = Uuid::from_u128(211);
        let preview_id = Uuid::from_u128(212);

        let mut persistent_updates = BTreeMap::new();
        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());

        let diff_update = EncodedUpdate::new(Update {
            mailbox: Uuid::nil(),
            id: event_id(100, 1, 1),
            body: UpdateBody::Diff {
                channel_id,
                diff: Box::new(crate::events::preview::PreviewDiff {
                    sender: sender_id,
                    payload: crate::events::preview::PreviewDiffPost {
                        channel_id,
                        id: preview_id,
                        keyframe_version: 1,
                        version: 1,
                        op: vec![],
                        entities: vec![],
                    },
                }),
            },
            live: UpdateLifetime::Volatile,
        });
        let should_broadcast = on_update(
            &mut persistent_updates,
            &mut preview_map,
            &mut diff_map,
            diff_update,
        );

        assert_eq!(should_broadcast, OnUpdateResult::SkipBroadcast);
        assert!(persistent_updates.is_empty());
        assert!(preview_map.is_empty());
        assert!(diff_map.is_empty());
    }

    #[test]
    fn cached_updates_start_at_honors_cursor_floor() {
        let mut persistent_updates = BTreeMap::new();
        assert_eq!(cached_updates_start_at(&persistent_updates, i64::MIN), i64::MIN);
        assert_eq!(cached_updates_start_at(&persistent_updates, 123), 123);

        let oldest = event_id(100, 1, 1);
        persistent_updates.insert(oldest, persistent_update(oldest));
        persistent_updates.insert(event_id(101, 1, 2), persistent_update(event_id(101, 1, 2)));
        assert_eq!(cached_updates_start_at(&persistent_updates, i64::MIN), 100);
        assert_eq!(cached_updates_start_at(&persistent_updates, 150), 150);
    }

    #[test]
    fn cleanup_removes_expired_preview() {
        let stale_preview_id = event_id(timestamp() - (1000 * 60 * 16), 1, 1);
        let preview_key = ChannelUserId::new(Uuid::nil(), Uuid::from_u128(10));

        let mut persistent_updates = BTreeMap::new();
        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        preview_map.insert(
            preview_key,
            StoredPreview {
                id: stale_preview_id,
                encoded: Utf8Bytes::from_static("{}"),
                preview_id: Uuid::from_u128(11),
                preview_version: 1,
            },
        );
        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());

        let floor = cleanup(&mut persistent_updates, &mut preview_map, &mut diff_map);

        assert_eq!(floor, None);
        assert!(preview_map.is_empty());
        assert!(persistent_updates.is_empty());
    }

    #[test]
    fn cleanup_removes_orphan_diff() {
        let orphan_diff_id = event_id(timestamp(), 1, 2);
        let diff_key = ChannelUserId::new(Uuid::nil(), Uuid::from_u128(20));

        let mut persistent_updates = BTreeMap::new();
        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());
        diff_map.insert(
            diff_key,
            StoredDiff {
                id: orphan_diff_id,
                encoded: Utf8Bytes::from_static("{}"),
                preview_id: Uuid::from_u128(21),
                preview_version: 1,
                diff_version: 1,
            },
        );

        let floor = cleanup(&mut persistent_updates, &mut preview_map, &mut diff_map);

        assert_eq!(floor, None);
        assert!(diff_map.is_empty());
        assert!(persistent_updates.is_empty());
    }

    #[test]
    fn members_event_does_not_purge_channel_cache() {
        let channel_id = Uuid::from_u128(30);
        let sender_id = Uuid::from_u128(31);
        let message_id = Uuid::from_u128(32);
        let preview_id = Uuid::from_u128(33);
        let key = ChannelUserId::new(channel_id, sender_id);

        let message_event_id = event_id(timestamp(), 1, 3);
        let preview_event_id = event_id(timestamp(), 1, 4);
        let diff_event_id = event_id(timestamp(), 1, 5);
        let members_event_id = event_id(timestamp(), 1, 6);

        let mut persistent_updates = BTreeMap::new();
        persistent_updates.insert(
            message_event_id,
            StoredUpdate {
                encoded: Utf8Bytes::from_static("{\"type\":\"NEW_MESSAGE\"}"),
                meta: StoredUpdateMeta::MessageWithPreview {
                    key,
                    preview_id: Some(preview_id),
                    channel_id,
                    message_id,
                },
            },
        );
        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        preview_map.insert(
            key,
            StoredPreview {
                id: preview_event_id,
                encoded: Utf8Bytes::from_static("{\"type\":\"MESSAGE_PREVIEW\"}"),
                preview_id,
                preview_version: 1,
            },
        );
        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());
        diff_map.insert(
            key,
            StoredDiff {
                id: diff_event_id,
                encoded: Utf8Bytes::from_static("{\"type\":\"DIFF\"}"),
                preview_id,
                preview_version: 1,
                diff_version: 1,
            },
        );

        let members_update = EncodedUpdate::new(Update {
            mailbox: Uuid::nil(),
            id: members_event_id,
            body: UpdateBody::Members {
                channel_id,
                members: vec![],
            },
            live: UpdateLifetime::Persistent,
        });
        on_update(
            &mut persistent_updates,
            &mut preview_map,
            &mut diff_map,
            members_update,
        );

        assert!(persistent_updates.contains_key(&message_event_id));
        assert!(!persistent_updates.contains_key(&members_event_id));
        assert_eq!(preview_map.get(&key).map(|v| v.id), Some(preview_event_id));
        assert_eq!(diff_map.get(&key).map(|v| v.id), Some(diff_event_id));
    }

    #[test]
    fn cleanup_keeps_persistent_history_when_volatile_overflows_total_cap() {
        let now = timestamp();
        let first_persistent_id = event_id(now - 20_000, 1, 1);

        let mut persistent_updates = BTreeMap::new();
        persistent_updates.insert(
            first_persistent_id,
            StoredUpdate {
                encoded: Utf8Bytes::from_static("{\"type\":\"PERSISTENT\"}"),
                meta: StoredUpdateMeta::Other {
                    channel_id: Some(Uuid::nil()),
                    message_id: None,
                },
            },
        );

        for i in 0..511u32 {
            let id = event_id(now - 19_000 + i as i64, 1, i + 2);
            persistent_updates.insert(
                id,
                StoredUpdate {
                    encoded: Utf8Bytes::from_static("{\"type\":\"PERSISTENT\"}"),
                    meta: StoredUpdateMeta::Other {
                        channel_id: Some(Uuid::nil()),
                        message_id: None,
                    },
                },
            );
        }

        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());
        for i in 0..40u32 {
            let event_id = event_id(now + i as i64, 1, i + 600);
            let key = ChannelUserId::new(Uuid::nil(), Uuid::from_u128(10_000 + i as u128));
            preview_map.insert(
                key,
                StoredPreview {
                    id: event_id,
                    encoded: Utf8Bytes::from_static("{\"type\":\"MESSAGE_PREVIEW\"}"),
                    preview_id: Uuid::from_u128(20_000 + i as u128),
                    preview_version: 1,
                },
            );
        }

        let floor = cleanup(&mut persistent_updates, &mut preview_map, &mut diff_map);

        assert_eq!(floor, None);
        let persistent_count = persistent_updates.len();
        assert_eq!(persistent_count, 512);
        assert!(persistent_updates.contains_key(&first_persistent_id));
    }

    #[test]
    fn cleanup_removes_volatile_entries_older_than_trimmed_persistent_start() {
        let now = timestamp();
        let removed_persistent_id = event_id(now - 10_000, 1, 1);
        let oldest_kept_persistent_id = event_id(now - 9_999, 1, 2);
        let volatile_key = ChannelUserId::new(Uuid::from_u128(41), Uuid::from_u128(42));
        let preview_id = Uuid::from_u128(43);

        let mut persistent_updates = BTreeMap::new();
        persistent_updates.insert(
            removed_persistent_id,
            StoredUpdate {
                encoded: Utf8Bytes::from_static("{\"type\":\"PERSISTENT_OLD\"}"),
                meta: StoredUpdateMeta::Other {
                    channel_id: Some(Uuid::nil()),
                    message_id: None,
                },
            },
        );

        for i in 0..512u32 {
            let id = event_id(now - 9_999 + i as i64, 1, i + 2);
            persistent_updates.insert(
                id,
                StoredUpdate {
                    encoded: Utf8Bytes::from_static("{\"type\":\"PERSISTENT\"}"),
                    meta: StoredUpdateMeta::Other {
                        channel_id: Some(Uuid::nil()),
                        message_id: None,
                    },
                },
            );
        }

        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        preview_map.insert(
            volatile_key,
            StoredPreview {
                id: removed_persistent_id,
                encoded: Utf8Bytes::from_static("{\"type\":\"MESSAGE_PREVIEW\"}"),
                preview_id,
                preview_version: 1,
            },
        );
        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());
        diff_map.insert(
            volatile_key,
            StoredDiff {
                id: removed_persistent_id,
                encoded: Utf8Bytes::from_static("{\"type\":\"DIFF\"}"),
                preview_id,
                preview_version: 1,
                diff_version: 1,
            },
        );

        let floor = cleanup(&mut persistent_updates, &mut preview_map, &mut diff_map);

        assert_eq!(floor, Some(removed_persistent_id.timestamp.saturating_add(1)));
        assert_eq!(persistent_updates.len(), 512);
        assert!(!persistent_updates.contains_key(&removed_persistent_id));
        assert!(persistent_updates.contains_key(&oldest_kept_persistent_id));
        assert!(preview_map.is_empty());
        assert!(diff_map.is_empty());
    }

    #[test]
    fn cleanup_keeps_matching_diff_when_preview_is_valid() {
        let now = timestamp();
        let key = ChannelUserId::new(Uuid::from_u128(51), Uuid::from_u128(52));
        let preview_id = Uuid::from_u128(53);
        let preview_event_id = event_id(now - 1_000, 1, 1);
        let diff_event_id = event_id(now - 500, 1, 2);

        let mut persistent_updates = BTreeMap::new();
        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        preview_map.insert(
            key,
            StoredPreview {
                id: preview_event_id,
                encoded: Utf8Bytes::from_static("{\"type\":\"MESSAGE_PREVIEW\"}"),
                preview_id,
                preview_version: 2,
            },
        );
        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());
        diff_map.insert(
            key,
            StoredDiff {
                id: diff_event_id,
                encoded: Utf8Bytes::from_static("{\"type\":\"DIFF\"}"),
                preview_id,
                preview_version: 2,
                diff_version: 2,
            },
        );

        let floor = cleanup(&mut persistent_updates, &mut preview_map, &mut diff_map);

        assert_eq!(floor, None);
        assert_eq!(preview_map.get(&key).map(|v| v.id), Some(preview_event_id));
        assert_eq!(diff_map.get(&key).map(|v| v.id), Some(diff_event_id));
    }

    #[test]
    fn channel_deleted_purges_only_target_channel_across_stores() {
        let channel_a = Uuid::from_u128(61);
        let channel_b = Uuid::from_u128(62);
        let sender_a = Uuid::from_u128(63);
        let sender_b = Uuid::from_u128(64);
        let key_a = ChannelUserId::new(channel_a, sender_a);
        let key_b = ChannelUserId::new(channel_b, sender_b);
        let preview_id_a = Uuid::from_u128(65);
        let preview_id_b = Uuid::from_u128(66);

        let persistent_a = event_id(timestamp(), 1, 1);
        let persistent_b = event_id(timestamp(), 1, 2);
        let deleted_event_id = event_id(timestamp(), 1, 3);

        let mut persistent_updates = BTreeMap::new();
        persistent_updates.insert(
            persistent_a,
            StoredUpdate {
                encoded: Utf8Bytes::from_static("{\"type\":\"PERSISTENT_A\"}"),
                meta: StoredUpdateMeta::Other {
                    channel_id: Some(channel_a),
                    message_id: Some(Uuid::from_u128(67)),
                },
            },
        );
        persistent_updates.insert(
            persistent_b,
            StoredUpdate {
                encoded: Utf8Bytes::from_static("{\"type\":\"PERSISTENT_B\"}"),
                meta: StoredUpdateMeta::Other {
                    channel_id: Some(channel_b),
                    message_id: Some(Uuid::from_u128(68)),
                },
            },
        );

        let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
        preview_map.insert(
            key_a,
            StoredPreview {
                id: event_id(timestamp(), 1, 4),
                encoded: Utf8Bytes::from_static("{\"type\":\"MESSAGE_PREVIEW_A\"}"),
                preview_id: preview_id_a,
                preview_version: 1,
            },
        );
        preview_map.insert(
            key_b,
            StoredPreview {
                id: event_id(timestamp(), 1, 5),
                encoded: Utf8Bytes::from_static("{\"type\":\"MESSAGE_PREVIEW_B\"}"),
                preview_id: preview_id_b,
                preview_version: 1,
            },
        );

        let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());
        diff_map.insert(
            key_a,
            StoredDiff {
                id: event_id(timestamp(), 1, 6),
                encoded: Utf8Bytes::from_static("{\"type\":\"DIFF_A\"}"),
                preview_id: preview_id_a,
                preview_version: 1,
                diff_version: 1,
            },
        );
        diff_map.insert(
            key_b,
            StoredDiff {
                id: event_id(timestamp(), 1, 7),
                encoded: Utf8Bytes::from_static("{\"type\":\"DIFF_B\"}"),
                preview_id: preview_id_b,
                preview_version: 1,
                diff_version: 1,
            },
        );

        let channel_deleted_update = EncodedUpdate::new(Update {
            mailbox: Uuid::nil(),
            id: deleted_event_id,
            body: UpdateBody::ChannelDeleted {
                channel_id: channel_a,
            },
            live: UpdateLifetime::Persistent,
        });

        on_update(
            &mut persistent_updates,
            &mut preview_map,
            &mut diff_map,
            channel_deleted_update,
        );

        assert!(!persistent_updates.contains_key(&persistent_a));
        assert!(persistent_updates.contains_key(&persistent_b));
        assert!(!persistent_updates.contains_key(&deleted_event_id));
        assert!(!preview_map.contains_key(&key_a));
        assert!(preview_map.contains_key(&key_b));
        assert!(!diff_map.contains_key(&key_a));
        assert!(diff_map.contains_key(&key_b));
    }
}
