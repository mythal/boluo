use std::{
    collections::{BTreeSet, HashMap},
    sync::Arc,
    time::Duration,
};

use arc_swap::ArcSwap;
use uuid::Uuid;

use crate::utils::timestamp;

use super::{
    Update,
    models::{StatusKind, UserStatus},
    types::UpdateBody,
};

pub type StatusMap = Arc<HashMap<Uuid, UserStatus>>;

pub enum StatusAction {
    Update {
        connection_id: Uuid,
        user_id: Uuid,
        status: UserStatus,
    },
    Disconnect {
        connection_id: Uuid,
        user_id: Uuid,
        timestamp: i64,
    },
    Query(tokio::sync::oneshot::Sender<StatusMap>),
    Broadcast,
}

pub struct StatusState {
    space_id: Uuid,
    connection_statuses: HashMap<Uuid, HashMap<Uuid, UserStatus>>,
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
            connection_statuses: HashMap::new(),
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

    fn broadcast(&mut self) {
        if !super::broadcast::has_broadcast_receivers(self.space_id) {
            return;
        }
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
    }

    fn status_priority(kind: StatusKind) -> u8 {
        match kind {
            StatusKind::Offline => 0,
            StatusKind::Away => 1,
            StatusKind::Online => 2,
        }
    }

    fn aggregate_user_status(&self, user_id: Uuid, offline_timestamp: i64) -> UserStatus {
        let statuses = self
            .connection_statuses
            .get(&user_id)
            .into_iter()
            .flat_map(HashMap::values)
            .collect::<Vec<_>>();
        let Some(priority) = statuses
            .iter()
            .map(|status| Self::status_priority(status.kind))
            .max()
        else {
            return UserStatus {
                timestamp: offline_timestamp,
                kind: StatusKind::Offline,
                focus: Vec::new(),
            };
        };
        let kind = match priority {
            2 => StatusKind::Online,
            1 => StatusKind::Away,
            _ => StatusKind::Offline,
        };
        let matching_statuses = statuses
            .into_iter()
            .filter(|status| Self::status_priority(status.kind) == priority)
            .collect::<Vec<_>>();
        let timestamp = matching_statuses
            .iter()
            .map(|status| status.timestamp)
            .max()
            .unwrap_or(offline_timestamp);
        let focus = matching_statuses
            .into_iter()
            .flat_map(|status| status.focus.iter().copied())
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();
        UserStatus {
            timestamp,
            kind,
            focus,
        }
    }

    fn update_aggregate(&mut self, user_id: Uuid, offline_timestamp: i64) {
        let status = self.aggregate_user_status(user_id, offline_timestamp);
        let should_broadcast = self
            .status_map
            .get(&user_id)
            .is_none_or(|existing| existing.kind != status.kind || existing.focus != status.focus);
        self.status_map.insert(user_id, status);
        self.status_map_snapshot_dirty = true;
        if should_broadcast {
            metrics::counter!("boluo_server_events_status_aggregate_changes_total").increment(1);
            self.broadcast();
        }
    }

    pub fn update(&mut self, action: StatusAction) {
        match action {
            StatusAction::Update {
                connection_id,
                user_id,
                status,
            } => {
                let timestamp = status.timestamp;
                if status.kind == StatusKind::Offline {
                    if let Some(statuses) = self.connection_statuses.get_mut(&user_id) {
                        statuses.remove(&connection_id);
                        if statuses.is_empty() {
                            self.connection_statuses.remove(&user_id);
                        }
                    }
                } else {
                    self.connection_statuses
                        .entry(user_id)
                        .or_default()
                        .insert(connection_id, status);
                }
                self.update_aggregate(user_id, timestamp);
            }
            StatusAction::Disconnect {
                connection_id,
                user_id,
                timestamp,
            } => {
                if let Some(statuses) = self.connection_statuses.get_mut(&user_id) {
                    statuses.remove(&connection_id);
                    if statuses.is_empty() {
                        self.connection_statuses.remove(&user_id);
                    }
                }
                self.update_aggregate(user_id, timestamp);
            }
            StatusAction::Broadcast => {
                self.broadcast();
                if self.last_cleanup.elapsed() > Duration::from_secs(60 * 60) {
                    self.last_cleanup = std::time::Instant::now();
                    let one_week_ago = timestamp() - 60 * 60 * 24 * 7;
                    let before_len = self.status_map.len();
                    self.status_map.retain(|_, status| {
                        status.kind != StatusKind::Offline || status.timestamp > one_week_ago
                    });
                    if self.status_map.len() != before_len {
                        self.status_map_snapshot_dirty = true;
                    }
                    if self.status_map.capacity() > self.status_map.len().saturating_mul(2).max(64)
                    {
                        self.status_map.shrink_to(self.status_map.len().max(64));
                    }
                }
            }
            StatusAction::Query(sender) => {
                let _ = sender.send(self.snapshot());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn status(timestamp: i64, kind: StatusKind, focus: &[Uuid]) -> UserStatus {
        UserStatus {
            timestamp,
            kind,
            focus: focus.to_vec(),
        }
    }

    #[test]
    fn status_is_aggregated_across_connections() {
        let user_id = Uuid::new_v4();
        let online_connection = Uuid::new_v4();
        let away_connection = Uuid::new_v4();
        let channel_a = Uuid::new_v4();
        let channel_b = Uuid::new_v4();
        let mut state = StatusState::new(Uuid::new_v4());

        state.update(StatusAction::Update {
            connection_id: away_connection,
            user_id,
            status: status(10, StatusKind::Away, &[channel_b]),
        });
        state.update(StatusAction::Update {
            connection_id: online_connection,
            user_id,
            status: status(20, StatusKind::Online, &[channel_a]),
        });

        let aggregate = state.status_map.get(&user_id).unwrap();
        assert_eq!(aggregate.kind, StatusKind::Online);
        assert_eq!(aggregate.focus, vec![channel_a]);

        state.update(StatusAction::Disconnect {
            connection_id: online_connection,
            user_id,
            timestamp: 30,
        });
        let aggregate = state.status_map.get(&user_id).unwrap();
        assert_eq!(aggregate.kind, StatusKind::Away);
        assert_eq!(aggregate.focus, vec![channel_b]);

        state.update(StatusAction::Disconnect {
            connection_id: away_connection,
            user_id,
            timestamp: 40,
        });
        let aggregate = state.status_map.get(&user_id).unwrap();
        assert_eq!(aggregate.kind, StatusKind::Offline);
        assert_eq!(aggregate.timestamp, 40);
        assert!(aggregate.focus.is_empty());
    }

    #[test]
    fn closing_an_old_connection_does_not_override_a_new_connection() {
        let user_id = Uuid::new_v4();
        let old_connection = Uuid::new_v4();
        let new_connection = Uuid::new_v4();
        let mut state = StatusState::new(Uuid::new_v4());

        state.update(StatusAction::Update {
            connection_id: old_connection,
            user_id,
            status: status(10, StatusKind::Online, &[]),
        });
        state.update(StatusAction::Update {
            connection_id: new_connection,
            user_id,
            status: status(20, StatusKind::Online, &[]),
        });
        state.update(StatusAction::Disconnect {
            connection_id: old_connection,
            user_id,
            timestamp: 30,
        });

        let aggregate = state.status_map.get(&user_id).unwrap();
        assert_eq!(aggregate.kind, StatusKind::Online);
        assert_eq!(aggregate.timestamp, 20);
    }

    #[test]
    fn focus_is_deduplicated_and_combined_for_equally_active_connections() {
        let user_id = Uuid::new_v4();
        let channel_a = Uuid::from_u128(1);
        let channel_b = Uuid::from_u128(2);
        let mut state = StatusState::new(Uuid::new_v4());

        state.update(StatusAction::Update {
            connection_id: Uuid::new_v4(),
            user_id,
            status: status(10, StatusKind::Online, &[channel_b, channel_a]),
        });
        state.update(StatusAction::Update {
            connection_id: Uuid::new_v4(),
            user_id,
            status: status(20, StatusKind::Online, &[channel_a]),
        });

        let aggregate = state.status_map.get(&user_id).unwrap();
        assert_eq!(aggregate.focus, vec![channel_a, channel_b]);
        assert_eq!(aggregate.timestamp, 20);
    }
}
