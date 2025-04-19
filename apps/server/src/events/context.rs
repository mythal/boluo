use crate::channels::models::Member;
use crate::channels::ChannelMember;
use crate::events::Update;
use crate::spaces::SpaceMember;
use parking_lot::Mutex;
use std::collections::HashMap;
use std::collections::VecDeque;
use std::sync::Arc;
use std::sync::OnceLock as OnceCell;
use tokio::sync::broadcast;
use tokio_tungstenite::tungstenite::Utf8Bytes;
use uuid::Uuid;

use crate::utils::timestamp;

use super::models::UserStatus;
use super::types::UpdateBody;

pub const WAIT_SHORTLY: std::time::Duration = std::time::Duration::from_millis(6);
pub const WAIT: std::time::Duration = std::time::Duration::from_millis(100);
pub const WAIT_MORE: std::time::Duration = std::time::Duration::from_millis(1000);

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

    pub fn replace_body(&mut self, body: UpdateBody) {
        self.update.body = body;
        self.encoded = self.update.encode();
    }
}

type BroadcastTable =
    papaya::HashMap<Uuid, broadcast::Sender<Arc<EncodedUpdate>>, ahash::RandomState>;

static BROADCAST_TABLE: OnceCell<BroadcastTable> = OnceCell::new();

pub fn get_broadcast_table() -> &'static BroadcastTable {
    BROADCAST_TABLE.get_or_init(|| {
        papaya::HashMap::builder()
            .capacity(4096)
            .hasher(ahash::RandomState::new())
            .resize_mode(papaya::ResizeMode::Blocking)
            .build()
    })
}

pub fn get_mailbox_broadcast_rx(id: Uuid) -> broadcast::Receiver<Arc<EncodedUpdate>> {
    let broadcast_table = get_broadcast_table();
    let table = broadcast_table.pin();
    table
        .get_or_insert_with(id, || {
            let capacity = 256;
            let (tx, _) = broadcast::channel(capacity);
            tx
        })
        .subscribe()
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

pub struct MailBoxState {
    pub start_at: i64,
    pub updates: Mutex<VecDeque<Arc<EncodedUpdate>>>,
    pub preview_map: papaya::HashMap<ChannelUserId, Arc<EncodedUpdate>, ahash::RandomState>,
    members_cache: papaya::HashMap<ChannelUserId, Member, ahash::RandomState>,
    pub status: Mutex<HashMap<Uuid, UserStatus>>,
}

impl Default for MailBoxState {
    fn default() -> Self {
        MailBoxState {
            start_at: timestamp(),
            updates: Mutex::new(VecDeque::new()),
            preview_map: papaya::HashMap::with_hasher(ahash::RandomState::new()),
            members_cache: papaya::HashMap::builder()
                .capacity(64)
                .hasher(ahash::RandomState::new())
                .build(),
            status: Mutex::new(HashMap::new()),
        }
    }
}

impl MailBoxState {
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

    pub fn new_update(&self, shared_update: Arc<EncodedUpdate>) -> Arc<EncodedUpdate> {
        use super::types::UpdateBody::*;
        let update = &shared_update.update;
        match &update.body {
            MessagePreview { preview, .. } => {
                let preview_map = self.preview_map.pin();
                let key = ChannelUserId::new(preview.channel_id, preview.sender_id);
                preview_map.compute(key, |entry| match entry {
                    Some((_, existing)) if existing.update.id > update.id => {
                        papaya::Operation::Abort(())
                    }
                    _ => papaya::Operation::Insert(shared_update.clone()),
                });
            }
            MessageEdited {
                message: edited_message,
                ..
            } => {
                let mut updates = self.updates.lock();
                for encoded in updates.iter_mut().rev() {
                    if let NewMessage {
                        message: original,
                        channel_id,
                        preview_id,
                    } = &encoded.update.body
                    {
                        if original.id == edited_message.id
                            && original.channel_id == edited_message.channel_id
                            && original.modified < edited_message.modified
                        {
                            let body = NewMessage {
                                channel_id: *channel_id,
                                message: edited_message.clone(),
                                preview_id: *preview_id,
                            };
                            Arc::make_mut(encoded).replace_body(body);
                            break;
                        }
                    }
                }
            }
            MessageDeleted {
                message_id,
                channel_id,
                pos,
            } => {
                let mut updates = self.updates.lock();
                for encoded in updates.iter_mut().rev() {
                    if let NewMessage {
                        message: original, ..
                    } = &encoded.update.body
                    {
                        if original.id == *message_id && original.channel_id == *channel_id {
                            let body = MessageDeleted {
                                message_id: *message_id,
                                channel_id: *channel_id,
                                pos: *pos,
                            };
                            Arc::make_mut(encoded).replace_body(body);
                            break;
                        }
                    }
                }
            }
            NewMessage { .. } => {
                self.updates.lock().push_back(shared_update.clone());
            }
            ChannelDeleted { channel_id } => {
                if let Some(mut updates) = self.updates.try_lock_for(WAIT) {
                    updates.retain(|encoded| match &encoded.update.body {
                        NewMessage { channel_id: id, .. } => id != channel_id,
                        MessageEdited { channel_id: id, .. } => id != channel_id,
                        MessageDeleted { channel_id: id, .. } => id != channel_id,
                        _ => true,
                    });
                    {
                        let mut preview_map = self.preview_map.pin();
                        preview_map.retain(|id, _| id.channel_id != *channel_id);
                    }
                    self.members_cache
                        .pin()
                        .retain(|id, _| id.channel_id != *channel_id);
                }
            }
            ChannelEdited { .. }
            | Members { .. }
            | Initialized
            | StatusMap { .. }
            | AppUpdated { .. }
            | SpaceUpdated { .. }
            | Error { .. } => {
                // Do nothing
            }
        }
        shared_update
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
}

static STORE: OnceCell<Store> = OnceCell::new();

pub fn store() -> &'static Store {
    STORE.get_or_init(Store::new)
}
