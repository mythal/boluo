use std::{collections::HashMap, sync::Arc, time::Duration};

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
    status_map: StatusMap,
    last_cleanup: std::time::Instant,
}

impl StatusState {
    pub fn new(space_id: Uuid) -> Self {
        Self {
            space_id,
            status_map: Default::default(),
            last_cleanup: std::time::Instant::now(),
        }
    }

    pub fn update(&mut self, action: StatusAction) {
        match action {
            StatusAction::Update(user_id, status) => {
                let kind = status.kind;
                if let Some(existing) = Arc::make_mut(&mut self.status_map).insert(user_id, status)
                {
                    if existing.kind == kind {
                        return;
                    }
                    Update::transient(
                        self.space_id,
                        UpdateBody::StatusMap {
                            status_map: Arc::clone(&self.status_map),
                            space_id: self.space_id,
                        },
                    )
                }
            }
            StatusAction::Broadcast => {
                Update::transient(
                    self.space_id,
                    UpdateBody::StatusMap {
                        status_map: Arc::clone(&self.status_map),
                        space_id: self.space_id,
                    },
                );
                metrics::histogram!("boluo_server_events_status_map_size")
                    .record(self.status_map.len() as f64);
                if self.last_cleanup.elapsed() > Duration::from_secs(60 * 60) {
                    self.last_cleanup = std::time::Instant::now();
                    let one_week_ago = timestamp() - 60 * 60 * 24 * 7;
                    let map = Arc::make_mut(&mut self.status_map);
                    map.retain(|_, status| {
                        use crate::events::models::StatusKind;
                        status.kind != StatusKind::Offline || status.timestamp > one_week_ago
                    });
                    if map.capacity() > 64 {
                        map.shrink_to_fit();
                    }
                }
            }
            StatusAction::Query(sender) => {
                let _ = sender.send(self.status_map.clone());
            }
        }
    }
}
