use crate::channels::models::Member;
use crate::channels::ChannelMember;
use crate::events::Event;
use crate::spaces::SpaceMember;
use parking_lot::Mutex;
use std::collections::HashMap;
use std::collections::VecDeque;
use std::sync::Arc;
use std::sync::OnceLock as OnceCell;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::utils::timestamp;

use super::models::UserStatus;

pub const WAIT_SHORTLY: std::time::Duration = std::time::Duration::from_millis(6);
pub const WAIT: std::time::Duration = std::time::Duration::from_millis(100);
pub const WAIT_MORE: std::time::Duration = std::time::Duration::from_millis(1000);

#[derive(Debug, Clone)]
pub enum StateError {
    TimeOut,
    NotFound,
}

#[derive(Debug)]
pub struct SyncEvent {
    pub event: Event,
    pub encoded: String,
}

impl SyncEvent {
    pub fn new(event: Event) -> SyncEvent {
        let encoded = serde_json::to_string(&event).unwrap();
        SyncEvent { encoded, event }
    }
}

type BroadcastTable = papaya::HashMap<Uuid, broadcast::Sender<Arc<SyncEvent>>, ahash::RandomState>;

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

pub async fn get_mailbox_broadcast_rx(id: &Uuid) -> broadcast::Receiver<Arc<SyncEvent>> {
    let broadcast_table = get_broadcast_table();
    let table = broadcast_table.pin();
    if let Some(sender) = table.get(id) {
        sender.subscribe()
    } else {
        let capacity = 256;
        let (tx, rx) = broadcast::channel(capacity);
        table.insert(*id, tx);
        rx
    }
}

pub struct Members {
    pub map: HashMap<Uuid, Member>,
    pub instant: std::time::Instant,
}
pub struct MailBoxState {
    pub start_at: i64,
    pub events: Mutex<VecDeque<Arc<SyncEvent>>>,
    pub preview_map: Mutex<HashMap<(Uuid, Uuid), Arc<SyncEvent>>>, // (sender id, channel id)
    pub edition_map: Mutex<HashMap<Uuid, Arc<SyncEvent>>>,         // the key is message id
    pub members_cache: Mutex<HashMap<Uuid, Members>>,
    pub status: Mutex<HashMap<Uuid, UserStatus>>,
}

impl Default for MailBoxState {
    fn default() -> Self {
        MailBoxState {
            start_at: timestamp(),
            events: Mutex::new(VecDeque::new()),
            preview_map: Mutex::new(HashMap::new()),
            edition_map: Mutex::new(HashMap::new()),
            members_cache: Mutex::new(HashMap::new()),
            status: Mutex::new(HashMap::new()),
        }
    }
}

impl MailBoxState {
    pub fn remove_channel(&self, channel_id: &Uuid) -> Result<(), StateError> {
        self.members_cache
            .try_lock_for(WAIT_MORE)
            .ok_or(StateError::TimeOut)
            .map(|mut members_cache| {
                members_cache.remove(channel_id);
            })
    }

    pub fn is_master(&self, channel_id: &Uuid, user_id: &Uuid) -> Result<bool, StateError> {
        let members_cache = self
            .members_cache
            .try_lock_for(WAIT_SHORTLY)
            .ok_or(StateError::TimeOut)?;
        members_cache
            .get(channel_id)
            .ok_or(StateError::NotFound)?
            .map
            .get(user_id)
            .ok_or(StateError::NotFound)
            .map(|member| member.channel.is_master)
    }

    pub fn get_member(&self, channel_id: &Uuid, user_id: &Uuid) -> Result<Member, StateError> {
        let members_cache = self
            .members_cache
            .try_lock_for(WAIT_SHORTLY)
            .ok_or(StateError::TimeOut)?;
        members_cache
            .get(channel_id)
            .and_then(|members| members.map.get(user_id))
            .ok_or(StateError::NotFound)
            .cloned()
    }

    pub fn update_channel_member(&self, channel_member: ChannelMember) {
        let mut members_cache = self.members_cache.lock();
        if let Some(members) = members_cache.get_mut(&channel_member.channel_id) {
            if let Some(member) = members.map.get_mut(&channel_member.user_id) {
                member.channel = channel_member;
            }
        }
    }
    pub fn update_space_member(&self, space_member: SpaceMember) {
        let mut members_cache = self.members_cache.lock();
        for members in members_cache.values_mut() {
            if let Some(member) = members.map.get_mut(&space_member.user_id) {
                member.space = space_member.clone();
            }
        }
    }

    pub fn remove_member(&self, user_id: &Uuid) {
        let mut members_cache = self.members_cache.lock();
        for members in members_cache.values_mut() {
            members.map.remove(user_id);
        }
        members_cache.retain(|_, members| !members.map.is_empty());
    }

    pub fn remove_member_from_channel(&self, channel_id: &Uuid, user_id: &Uuid) {
        let mut members_cache = self.members_cache.lock();
        if let Some(members) = members_cache.get_mut(channel_id) {
            members.map.remove(user_id);
            if members.map.is_empty() {
                members_cache.remove(channel_id);
            }
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
}

static STORE: OnceCell<Store> = OnceCell::new();

pub fn store() -> &'static Store {
    STORE.get_or_init(Store::new)
}
