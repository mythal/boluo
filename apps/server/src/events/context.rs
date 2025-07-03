use crate::channels::ChannelMember;
use crate::channels::models::Member;
use crate::events::Update;
use crate::spaces::SpaceMember;
use crate::utils::timestamp;
use std::collections::BTreeMap;
use std::sync::OnceLock as OnceCell;
use tokio::sync::mpsc::error::TrySendError;
use tokio_tungstenite::tungstenite::Utf8Bytes;
use uuid::Uuid;

use super::types::EventId;

#[derive(Debug, Clone)]
pub enum StateError {
    TimeOut,
    NotFound,
}

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

pub enum Action {
    Query(tokio::sync::oneshot::Sender<BTreeMap<EventId, Utf8Bytes>>),
    Update(Box<EncodedUpdate>),
}

pub struct MailBoxState {
    pub id: Uuid,
    pub sender: tokio::sync::mpsc::Sender<Action>,
    members_cache: papaya::HashMap<ChannelUserId, Member, ahash::RandomState>,
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
        tokio::spawn(async move {
            let mut updates: BTreeMap<EventId, EncodedUpdate> = BTreeMap::new();
            let mut preview_map = PreviewMap::with_hasher(ahash::RandomState::new());
            let mut last_activity_at = std::time::Instant::now();
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
            sender: tx,
            members_cache: papaya::HashMap::builder()
                .capacity(64)
                .hasher(ahash::RandomState::new())
                .build(),
            status: super::status::StatusActor::new(id),
        }
    }
    pub fn get_members_in_channel(&self, channel_id: Uuid) -> Vec<Member> {
        let mut members: Vec<Member> = Vec::new();
        let members_cache = self.members_cache.pin();

        for id in members_cache.keys() {
            if id.channel_id == channel_id {
                if let Some(member) = members_cache.get(id) {
                    members.push(member.clone())
                }
            }
        }
        members
    }

    pub fn set_members(&self, members: &Vec<Member>) {
        let members_cache = self.members_cache.pin();
        for member in members {
            let channel_user_id =
                ChannelUserId::new(member.channel.channel_id, member.channel.user_id);
            members_cache.insert(channel_user_id, member.clone());
        }
    }

    pub fn remove_channel(&self, channel_id: Uuid) -> Result<(), StateError> {
        self.members_cache
            .pin()
            .retain(|id, _| id.channel_id != channel_id);
        Ok(())
    }

    pub fn is_master(&self, channel_id: Uuid, user_id: Uuid) -> Result<bool, StateError> {
        let members_cache = self.members_cache.pin();
        members_cache
            .get(&ChannelUserId::new(channel_id, user_id))
            .ok_or(StateError::NotFound)
            .map(|member| member.channel.is_master)
    }

    pub fn get_member(&self, channel_id: Uuid, user_id: Uuid) -> Result<Member, StateError> {
        let members_cache = self.members_cache.pin();
        members_cache
            .get(&ChannelUserId::new(channel_id, user_id))
            .ok_or(StateError::NotFound)
            .cloned()
    }

    pub fn update_channel_member(&self, channel_member: ChannelMember) {
        let channel_user_id = ChannelUserId::new(channel_member.channel_id, channel_member.user_id);
        self.members_cache
            .pin()
            .update(channel_user_id, move |member| {
                let channel_member = channel_member.clone();
                let mut member = member.clone();
                member.channel = channel_member;
                member
            });
    }
    pub fn update_space_member(&self, space_member: SpaceMember) {
        let user_id = space_member.user_id;
        let members_cache = self.members_cache.pin();
        for channel_user_id in members_cache.keys() {
            if user_id == channel_user_id.user_id {
                members_cache.update(*channel_user_id, |member| {
                    let mut member = member.clone();
                    member.space = space_member.clone();
                    member
                });
            }
        }
    }

    pub fn remove_member(&self, user_id: &Uuid) {
        let mut members_cache = self.members_cache.pin();
        members_cache.retain(|id, _| id.user_id != *user_id);
    }

    pub fn remove_member_from_channel(&self, channel_id: Uuid, user_id: Uuid) {
        let channel_user_id = ChannelUserId::new(channel_id, user_id);
        let members_cache = self.members_cache.pin();
        members_cache.remove(&channel_user_id);
    }

    pub fn query(
        &self,
    ) -> Result<tokio::sync::oneshot::Receiver<BTreeMap<EventId, Utf8Bytes>>, TrySendError<Action>>
    {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let action = Action::Query(tx);
        if let Err(err) = self.sender.try_send(action) {
            match err {
                TrySendError::Closed(_) => {
                    tracing::warn!(
                        "Failed to send query to mailbox {}: channel closed",
                        self.id
                    );
                }
                TrySendError::Full(_) => {
                    tracing::warn!("Failed to send query to mailbox {}: channel full", self.id);
                }
            }
            return Err(err);
        }
        Ok(rx)
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

    fn remove(&self, id: Uuid) {
        self.mailboxes.pin().remove(&id);
    }
}

static STORE: OnceCell<Store> = OnceCell::new();

pub fn store() -> &'static Store {
    STORE.get_or_init(Store::new)
}
