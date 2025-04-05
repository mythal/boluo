use crate::channels::models::Member;
use crate::channels::ChannelMember;
use crate::events::Event;
use crate::spaces::SpaceMember;
use std::collections::HashMap;
use std::collections::VecDeque;
use std::sync::Arc;
use std::sync::OnceLock as OnceCell;
use tokio::sync::{broadcast, Mutex};
use uuid::Uuid;

use crate::utils::timestamp;

use super::models::UserStatus;

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

type BroadcastTable = papaya::HashMap<Uuid, broadcast::Sender<Arc<SyncEvent>>>;

static BROADCAST_TABLE: OnceCell<BroadcastTable> = OnceCell::new();

pub fn get_broadcast_table() -> &'static BroadcastTable {
    BROADCAST_TABLE.get_or_init(|| papaya::HashMap::new())
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
    pub events: VecDeque<Arc<SyncEvent>>,
    pub preview_map: HashMap<(Uuid, Uuid), Arc<SyncEvent>>, // (sender id, channel id)
    pub edition_map: HashMap<Uuid, Arc<SyncEvent>>,         // the key is message id
    pub members_cache: HashMap<Uuid, Members>,
    pub status: HashMap<Uuid, UserStatus>,
}

impl MailBoxState {
    pub fn remove_channel(&mut self, channel_id: &Uuid) {
        self.members_cache.remove(channel_id);
    }

    pub fn update_channel_member(&mut self, channel_member: ChannelMember) {
        if let Some(members) = self.members_cache.get_mut(&channel_member.channel_id) {
            if let Some(member) = members.map.get_mut(&channel_member.user_id) {
                member.channel = channel_member;
            }
        }
    }
    pub fn update_space_member(&mut self, space_member: SpaceMember) {
        for members in self.members_cache.values_mut() {
            if let Some(member) = members.map.get_mut(&space_member.user_id) {
                member.space = space_member.clone();
            }
        }
    }

    pub fn remove_member(&mut self, user_id: &Uuid) {
        for members in self.members_cache.values_mut() {
            members.map.remove(user_id);
        }
        self.members_cache
            .retain(|_, members| !members.map.is_empty());
    }

    pub fn remove_member_from_channel(&mut self, channel_id: &Uuid, user_id: &Uuid) {
        if let Some(members) = self.members_cache.get_mut(channel_id) {
            members.map.remove(user_id);
            if members.map.is_empty() {
                self.members_cache.remove(channel_id);
            }
        }
    }
}

pub struct Store {
    pub mailboxes: papaya::HashMap<Uuid, Arc<Mutex<MailBoxState>>>,
}

impl Store {
    pub fn new() -> Store {
        Store {
            mailboxes: papaya::HashMap::new(),
        }
    }

    pub async fn get_mailbox(&self, mailbox_id: &Uuid) -> Option<Arc<Mutex<MailBoxState>>> {
        let map = self.mailboxes.pin();
        map.get(mailbox_id).cloned()
    }

    pub async fn ensure_mailbox(&self, mailbox_id: &Uuid) -> Arc<Mutex<MailBoxState>> {
        let map = self.mailboxes.pin();
        map.get_or_insert_with(*mailbox_id, || {
            let cache = MailBoxState {
                start_at: timestamp(),
                events: VecDeque::new(),
                preview_map: HashMap::new(),
                edition_map: HashMap::new(),
                members_cache: HashMap::new(),
                status: HashMap::new(),
            };
            Arc::new(Mutex::new(cache))
        })
        .clone()
    }
}

static STORE: OnceCell<Store> = OnceCell::new();

pub fn store() -> &'static Store {
    STORE.get_or_init(Store::new)
}
