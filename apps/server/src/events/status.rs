use std::{collections::HashMap, sync::Arc, time::Duration};

use arc_swap::ArcSwap;
use uuid::Uuid;

use crate::utils::timestamp;

use super::{Update, models::UserStatus, types::UpdateBody};

pub type StatusMap = Arc<HashMap<Uuid, UserStatus>>;

pub enum StatusAction {
    Update(Uuid, UserStatus),
    Query(tokio::sync::oneshot::Sender<StatusMap>),
    Broadcast,
}

pub struct StatusState {
    space_id: Uuid,
    status_map: HashMap<Uuid, UserStatus>,
    status_map_snapshot: ArcSwap<HashMap<Uuid, UserStatus>>,
    status_map_snapshot_dirty: bool,
    last_cleanup: std::time::Instant,
}

impl StatusState {
    pub fn new(space_id: Uuid) -> Self {
        let status_map = HashMap::new();
        Self {
            space_id,
            status_map_snapshot: ArcSwap::from_pointee(status_map.clone()),
            status_map,
            status_map_snapshot_dirty: false,
            last_cleanup: std::time::Instant::now(),
        }
    }

    fn snapshot(&mut self) -> StatusMap {
        if self.status_map_snapshot_dirty {
            self.status_map_snapshot
                .store(Arc::new(self.status_map.clone()));
            self.status_map_snapshot_dirty = false;
        }
        self.status_map_snapshot.load_full()
    }

    pub fn update(&mut self, action: StatusAction) {
        match action {
            StatusAction::Update(user_id, status) => {
                let kind = status.kind;
                let existing = self.status_map.insert(user_id, status);
                self.status_map_snapshot_dirty = true;
                if let Some(existing) = existing {
                    if existing.kind == kind {
                        return;
                    }
                    let status_map = self.snapshot();
                    Update::transient(
                        self.space_id,
                        UpdateBody::StatusMap {
                            status_map,
                            space_id: self.space_id,
                        },
                    )
                }
            }
            StatusAction::Broadcast => {
                let status_map = self.snapshot();
                Update::transient(
                    self.space_id,
                    UpdateBody::StatusMap {
                        status_map,
                        space_id: self.space_id,
                    },
                );
                metrics::histogram!("boluo_server_events_status_map_size")
                    .record(self.status_map.len() as f64);
                if self.last_cleanup.elapsed() > Duration::from_secs(60 * 60) {
                    self.last_cleanup = std::time::Instant::now();
                    let one_week_ago = timestamp() - 60 * 60 * 24 * 7;
                    let before_len = self.status_map.len();
                    self.status_map.retain(|_, status| {
                        use crate::events::models::StatusKind;
                        status.kind != StatusKind::Offline || status.timestamp > one_week_ago
                    });
                    if self.status_map.len() != before_len {
                        self.status_map_snapshot_dirty = true;
                    }
                    if self.status_map.capacity() > 64 {
                        self.status_map.shrink_to_fit();
                    }
                }
            }
            StatusAction::Query(sender) => {
                let _ = sender.send(self.snapshot());
            }
        }
    }
}
