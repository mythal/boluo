use crate::channels::ChannelMember;
use crate::channels::models::Member;
use crate::events::models::UserStatus;
use crate::events::status::StatusAction;
use crate::events::types::{ChannelUserId, UpdateBody, UpdateLifetime};
use crate::events::{StatusMap, Update};
use crate::spaces::SpaceMember;
use crate::utils::timestamp;
use std::collections::BTreeMap;
use std::sync::OnceLock as OnceCell;
use tokio::sync::mpsc::error::TrySendError;
use tokio_tungstenite::tungstenite::Utf8Bytes;
use tracing::Instrument;
use uuid::Uuid;

use super::types::EventId;

mod members;

pub use self::members::Action as MembersAction;

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

    pub fn refresh_encoded(&mut self) {
        self.encoded = self.update.encode();
    }
}

pub enum Action {
    Query(tokio::sync::oneshot::Sender<CachedUpdates>),
    Update { body: UpdateBody },
    Members(MembersAction),
    Status(super::status::StatusAction),
}

const MAILBOX_STATE_WRITE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(16);
const MAILBOX_STATE_READ_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(2);

#[derive(Clone)]
pub struct MailboxManager {
    pub id: Uuid,
    sender: tokio::sync::mpsc::Sender<Action>,
}

impl MailboxManager {
    pub fn new(id: Uuid, sender: tokio::sync::mpsc::Sender<Action>) -> Self {
        MailboxManager { id, sender }
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

    pub async fn get_members_in_channel(
        &self,
        channel_id: Uuid,
    ) -> Result<Vec<Member>, MailboxManageError> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let action = Action::Members(MembersAction::QueryByChannel(channel_id, tx));
        self.send_read_action(action).await?;
        rx.await.map_err(|_| MailboxManageError::Closed)
    }

    pub async fn set_members(&self, members: Vec<Member>) -> Result<(), MailboxManageError> {
        let action = Action::Members(MembersAction::UpdateByMembers(members.clone()));
        self.send_write_action(action).await?;
        Ok(())
    }

    pub async fn remove_channel(&self, channel_id: Uuid) -> Result<(), MailboxManageError> {
        let action = Action::Members(MembersAction::RemoveChannel(channel_id));
        self.send_write_action(action).await?;
        Ok(())
    }

    pub async fn get_member(
        &self,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Member>, MailboxManageError> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let action = Action::Members(MembersAction::QueryByChannelUser(
            ChannelUserId::new(channel_id, user_id),
            tx,
        ));
        self.send_read_action(action).await?;
        rx.await.map_err(|_| MailboxManageError::Closed)
    }

    pub async fn is_master(
        &self,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, MailboxManageError> {
        let member = self.get_member(channel_id, user_id).await?;
        if let Some(member) = member {
            Ok(member.channel.is_master)
        } else {
            Ok(false)
        }
    }

    pub async fn update_channel_member(
        &self,
        channel_member: ChannelMember,
    ) -> Result<(), MailboxManageError> {
        let action = Action::Members(MembersAction::UpdateChannelMember(channel_member));
        self.send_write_action(action).await
    }

    pub async fn update_space_member(
        &self,
        space_member: SpaceMember,
    ) -> Result<(), MailboxManageError> {
        let action = Action::Members(MembersAction::UpdateSpaceMember(space_member));
        self.send_write_action(action).await
    }

    pub async fn remove_member(&self, user_id: &Uuid) -> Result<(), MailboxManageError> {
        let action = Action::Members(MembersAction::RemoveUser(*user_id));
        self.send_write_action(action).await
    }

    pub async fn remove_member_from_channel(
        &self,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), MailboxManageError> {
        let channel_user_id = ChannelUserId::new(channel_id, user_id);
        let action = Action::Members(MembersAction::RemoveFromChannel(channel_user_id));
        self.send_write_action(action).await
    }

    pub async fn query_encoded_updates(
        &self,
    ) -> Result<tokio::sync::oneshot::Receiver<CachedUpdates>, MailboxManageError> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let action = Action::Query(tx);
        self.send_read_action(action).await?;
        Ok(rx)
    }

    pub async fn fire_update(&self, body: UpdateBody) -> Result<(), MailboxManageError> {
        let action = Action::Update { body };
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
}

pub struct CachedUpdates {
    pub updates: BTreeMap<EventId, Utf8Bytes>,
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

type PreviewMap = std::collections::HashMap<ChannelUserId, EncodedUpdate, ahash::RandomState>;
type DiffMap = std::collections::HashMap<ChannelUserId, EncodedUpdate, ahash::RandomState>;

fn on_update(
    updates: &mut BTreeMap<EventId, EncodedUpdate>,
    preview_map: &mut PreviewMap,
    diff_map: &mut DiffMap,
    mut encoded_update: EncodedUpdate,
) {
    use super::types::UpdateBody::*;
    let update = &encoded_update.update;
    match &update.body {
        | MessagePreview { preview, .. } => {
            let key = ChannelUserId::new(preview.channel_id, preview.sender_id);
            if let Some(existing) = preview_map.get(&key) {
                if existing.update.id >= update.id {
                    return;
                }
            }
            if let Some(diff) = diff_map.get(&key) {
                if let UpdateBody::Diff { diff, .. } = &diff.update.body {
                    if diff.payload.id != preview.id
                        || diff.payload.reference_version != preview.version
                    {
                        diff_map.remove(&key);
                    }
                };
            }
            preview_map.insert(key, encoded_update);
        }
        | Diff {
            channel_id, diff, ..
        } => {
            let key = ChannelUserId::new(*channel_id, diff.sender);
            let Some(reference_preview_update) = preview_map.get(&key) else {
                return;
            };
            if reference_preview_update.update.id >= update.id {
                return;
            }
            let UpdateBody::MessagePreview {
                preview: reference_preview,
                ..
            } = &reference_preview_update.update.body
            else {
                return;
            };
            if reference_preview.version != diff.payload.reference_version {
                return;
            }

            diff_map.insert(key, encoded_update);
        }
        | NewMessage {
            channel_id,
            message,
            preview_id,
        } => {
            let id = encoded_update.update.id;
            let preview_id = preview_id.unwrap_or_default();
            let key = ChannelUserId::new(*channel_id, message.sender_id);
            updates.insert(id, encoded_update);
            if !preview_id.is_nil() {
                if let Some(existing) = preview_map.get(&key) {
                    match &existing.update.body {
                        MessagePreview { preview, .. } => {
                            if preview.id == preview_id {
                                preview_map.remove(&key);
                            }
                        }
                        _ => tracing::warn!("Expected preview, but got {:?}", existing.update.body),
                    }
                }
            }
        }
        | MessageDeleted { message_id, .. } => {
            updates.retain(|_, encoded| encoded.update.body.message_id() != Some(*message_id));
            updates.insert(encoded_update.update.id, encoded_update);
        }
        | MessageEdited {
            channel_id,
            message,
            old_pos,
        } => {
            let channel_id = *channel_id;

            let mut prev_event_id_and_old_pos: Option<(EventId, f64)> = None;
            for (stored_update_id, stored_update) in updates.iter().rev() {
                if let MessageEdited {
                    message: original,
                    old_pos: original_old_pos,
                    ..
                } = &stored_update.update.body
                {
                    if original.id == message.id
                        && original.channel_id == channel_id
                        && original.modified < message.modified
                    {
                        prev_event_id_and_old_pos = Some((*stored_update_id, *original_old_pos));
                        break;
                    }
                }
            }
            if let Some((prev_event_id, prev_old_pos)) = prev_event_id_and_old_pos {
                updates.remove(&prev_event_id);
                if prev_old_pos != *old_pos {
                    match encoded_update.update.body {
                        MessageEdited {
                            ref mut old_pos, ..
                        } => {
                            *old_pos = prev_old_pos;
                        }
                        ref other_body => {
                            tracing::warn!("Expected MessageEdited, but got {:?}", other_body)
                        }
                    }
                    encoded_update.refresh_encoded();
                }
            }
            updates.insert(encoded_update.update.id, encoded_update);
        }
        | ChannelDeleted { channel_id } => {
            updates.retain(|_, encoded| encoded.update.body.channel_id() != Some(*channel_id));
            preview_map.retain(|id, _| id.channel_id != *channel_id);
        }
        | ChannelEdited { .. }
        | Members { .. }
        | Initialized
        | StatusMap { .. }
        | SpaceUpdated { .. }
        | Error { .. }
        | AppUpdated { .. }
        | AppInfo { .. } => {
            // Do nothing
        }
    }
}

fn cleanup(
    updates: &mut BTreeMap<EventId, EncodedUpdate>,
    preview_map: &mut PreviewMap,
    diff_map: &mut DiffMap,
) {
    use super::types::UpdateBody::*;

    let now = timestamp();
    let mut has_been_cleaned = false;
    let mut last_removed_timestamp: Option<i64> = None;
    while updates.len() > 512 {
        if let Some((event_id, _)) = updates.pop_first() {
            last_removed_timestamp = Some(event_id.timestamp);
        }
        has_been_cleaned = true;
    }
    // Drop all updates with the same timestamp as the last removed one, to avoid partial cleanup
    if let Some(removed_timestamp) = last_removed_timestamp {
        updates.retain(|event_id, _| event_id.timestamp != removed_timestamp);
    }
    let start_at = if has_been_cleaned {
        updates.first_key_value().map(|(id, _)| *id)
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

    preview_map.retain(|_, preview_update| match preview_update.update.body {
        | MessagePreview { .. } => {
            if let Some(start_at) = start_at {
                if preview_update.update.id < start_at {
                    return false;
                }
            }
            let elapsed = now - preview_update.update.id.timestamp;
            elapsed < 1000 * 60 * 15 // 15 minutes
        }
        _ => false,
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
    diff_map.retain(|_, diff_update| match &diff_update.update.body {
        | Diff {
            channel_id, diff, ..
        } => {
            let key = ChannelUserId::new(*channel_id, diff.sender);
            let Some(reference_preview_update) = preview_map.get(&key) else {
                return false;
            };
            let UpdateBody::MessagePreview { preview, .. } = &reference_preview_update.update.body
            else {
                return false;
            };
            diff.payload.id == preview.id && diff.payload.reference_version == preview.version
        }
        _ => false,
    });
}

impl MailBoxState {
    pub fn new(id: Uuid) -> Self {
        let (tx, mut rx) = tokio::sync::mpsc::channel::<Action>(1024);
        let manager = MailboxManager::new(id, tx);
        let span = tracing::info_span!("MailboxState", mailbox_id = %id);
        tokio::spawn(async move {
            let mut updates: BTreeMap<EventId, EncodedUpdate> = BTreeMap::new();
            let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
            let mut diff_map = DiffMap::with_hasher(ahash::RandomState::new());
            let mut last_activity_at = std::time::Instant::now();
            let mut members_state = members::MembersCache::new();
            let mut status_state = super::status::StatusState::new(id);
            let mut broadcast_status_interval = crate::utils::cleaner_interval(12);
            let mut cleanup_interval = crate::utils::cleaner_interval(120);
            let mut start_at = timestamp();
            let mut last_pending_actions_warned = 0;
            let labels = vec![metrics::Label::new("mailbox_id", id.to_string())];
            let pending_gauge = metrics::gauge!("boluo_server_events_pending_actions", labels.clone());
            let action_duration_histogram = metrics::histogram!("boluo_server_events_update_duration_ms", labels.clone());
            loop {
                tokio::select! {
                    Some(action) = rx.recv() => {
                        let pending = rx.len();
                        pending_gauge.set(pending as f64);
                        if pending > 256 && (pending - last_pending_actions_warned) > 8 {
                            tracing::info!(pending, "Too many pending actions");
                            last_pending_actions_warned = pending;
                        }
                        let start = std::time::Instant::now();
                        match action {
                            Action::Query(sender) => {
                                last_activity_at = std::time::Instant::now();
                                let mut response_updates: BTreeMap<EventId, Utf8Bytes> = updates.iter().map(|(event_id, value)| (*event_id, value.encoded.clone())).collect();
                                for preview in preview_map.values() {
                                    response_updates.insert(preview.update.id, preview.encoded.clone());
                                }
                                for diff in diff_map.values() {
                                    response_updates.insert(diff.update.id, diff.encoded.clone());
                                }
                                sender.send(CachedUpdates {
                                    updates: response_updates,
                                    start_at,
                                }).ok();
                            }
                            Action::Update { body } => {
                                last_activity_at = std::time::Instant::now();
                                let mailbox_id = id;
                                let encoded_update = match tokio::task::spawn_blocking(move || {
                                    EncodedUpdate::new(Update {
                                        mailbox: mailbox_id,
                                        body,
                                        id: EventId::new(),
                                        live: UpdateLifetime::Persistent,
                                    })
                                }).await {
                                    Ok(encoded_update) => encoded_update,
                                    Err(_) => {
                                        tracing::error!("Failed to build update");
                                        continue;
                                    }
                                };
                                let update_name = encoded_update.update.name();
                                let encoded_for_broadcast = encoded_update.encoded.clone();
                                on_update(
                                    &mut updates,
                                    &mut preview_map,
                                    &mut diff_map,
                                    encoded_update,
                                );
                                let elapsed = start.elapsed();
                                action_duration_histogram.record(elapsed.as_millis() as f64);
                                if elapsed > std::time::Duration::from_millis(25) {
                                    tracing::warn!(mailbox_id = %id, update_name, "Update took too long to process: {:?}", elapsed);
                                }
                                Update::send(id, encoded_for_broadcast).await;
                            }
                            Action::Members(action) => {
                                members_state.update(action);
                            },
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
                        if last_activity_at.elapsed() > std::time::Duration::from_secs(60 * 60 * 2) {
                            store().remove(id);
                            tracing::info!(mailbox_id = %id, "Mailbox state is idle, shutting down");
                            break;
                        } else {
                            let before_size = updates.len();
                            cleanup(&mut updates, &mut preview_map, &mut diff_map);
                            let after_size = updates.len();
                            if after_size != before_size {
                                tracing::info!(mailbox_id = %id, "Cleaned up {} updates", before_size - after_size);
                            }
                            match updates.first_key_value() {
                                Some((event_id, _)) => {
                                    start_at = event_id.timestamp;
                                }
                                None => {
                                    start_at = timestamp();
                                }
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

    fn remove(&self, id: Uuid) {
        self.mailboxes.pin().remove(&id);
    }
}

static STORE: OnceCell<Store> = OnceCell::new();

pub fn store() -> &'static Store {
    STORE.get_or_init(Store::new)
}
