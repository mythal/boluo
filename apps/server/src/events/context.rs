use crate::channels::ChannelMember;
use crate::channels::models::Member;
use crate::events::Update;
use crate::events::types::ChannelUserId;
use crate::spaces::SpaceMember;
use crate::utils::timestamp;
use std::collections::BTreeMap;
use std::sync::OnceLock as OnceCell;
use tokio_tungstenite::tungstenite::Utf8Bytes;
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
    Query(tokio::sync::oneshot::Sender<BTreeMap<EventId, Utf8Bytes>>),
    Update(Box<EncodedUpdate>),
    Members(MembersAction),
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
    ) -> Result<tokio::sync::oneshot::Receiver<BTreeMap<EventId, Utf8Bytes>>, MailboxManageError>
    {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let action = Action::Query(tx);
        self.send_read_action(action).await?;
        Ok(rx)
    }

    pub async fn fire_update(&self, update: Box<EncodedUpdate>) -> Result<(), MailboxManageError> {
        let action = Action::Update(update);
        self.send_write_action(action).await
    }
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
    pub status: super::status::StatusActor,
}

type PreviewMap = std::collections::HashMap<ChannelUserId, EncodedUpdate, ahash::RandomState>;

fn on_update(
    updates: &mut BTreeMap<EventId, EncodedUpdate>,
    preview_map: &mut PreviewMap,
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
            preview_map.insert(key, encoded_update);
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

fn cleanup(updates: &mut BTreeMap<EventId, EncodedUpdate>, preview_map: &mut PreviewMap) {
    use super::types::UpdateBody::*;

    let now = timestamp();
    let mut has_been_cleaned = false;
    while updates.len() > 512 {
        updates.pop_first();
        has_been_cleaned = true;
    }
    let start_at = if has_been_cleaned {
        updates.first_key_value().map(|(id, _)| *id)
    } else {
        None
    };

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
}

impl MailBoxState {
    pub fn new(id: Uuid) -> Self {
        let (tx, mut rx) = tokio::sync::mpsc::channel::<Action>(32);
        let manager = MailboxManager::new(id, tx);
        tokio::spawn(async move {
            let mut updates: BTreeMap<EventId, EncodedUpdate> = BTreeMap::new();
            let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
            let mut last_activity_at = std::time::Instant::now();
            let mut members_state = members::MembersCache::new();
            loop {
                tokio::select! {
                    Some(action) = rx.recv() => {
                        last_activity_at = std::time::Instant::now();
                        match action {
                            Action::Query(sender) => {
                                let mut updates = updates.iter().map(|(event_id, value)| (*event_id, value.encoded.clone())).collect::<BTreeMap<EventId, Utf8Bytes>>();
                                for preview in preview_map.values() {
                                    updates.insert(preview.update.id, preview.encoded.clone());
                                }
                                sender.send(updates).ok();
                            }
                            Action::Update(encoded_update) => {
                                on_update(&mut updates, &mut preview_map, *encoded_update);
                            }
                            Action::Members(action) => {
                                members_state.update(action);
                            }
                        }
                    }
                    _ = tokio::time::sleep(std::time::Duration::from_secs(60)) => {
                        if last_activity_at.elapsed() > std::time::Duration::from_secs(60 * 60 * 2) {
                            store().remove(id);
                        } else {
                            cleanup(&mut updates, &mut preview_map);
                        }
                    }
                    else => {
                        break;
                    }
                }
            }
        });

        MailBoxState {
            id,
            manager,
            status: super::status::StatusActor::new(id),
        }
    }
}

pub struct Store {
    pub mailboxes: papaya::HashMap<Uuid, MailBoxState, ahash::RandomState>,
}

impl Store {
    pub fn new() -> Store {
        Store {
            mailboxes: papaya::HashMap::builder()
                .capacity(4096)
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
