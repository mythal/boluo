use std::{collections::HashMap, sync::Arc, time::Duration};

use uuid::Uuid;

use crate::utils::timestamp;

use super::{Update, models::UserStatus, types::UpdateBody};

pub type StatusMap = Arc<HashMap<Uuid, UserStatus>>;

pub enum Action {
    Update(Uuid, UserStatus),
    Query(tokio::sync::oneshot::Sender<StatusMap>),
}

pub struct StatusActor {
    tx: tokio::sync::mpsc::Sender<Action>,
    join_handle: tokio::task::JoinHandle<()>,
}

impl StatusActor {
    pub fn new(space_id: Uuid) -> Self {
        let (tx, mut rx) = tokio::sync::mpsc::channel(128);

        let join_handle = tokio::spawn(async move {
            let mut map: StatusMap = Arc::new(HashMap::new());

            let mut push_interval = tokio::time::interval(Duration::from_secs(6));
            push_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            let mut cleanup_interval = tokio::time::interval(Duration::from_secs(60 * 60 * 24));
            cleanup_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                tokio::select! {
                    _ = push_interval.tick() => {
                        if !map.is_empty() {
                            Update::transient(
                                space_id,
                                UpdateBody::StatusMap {
                                    status_map: Arc::clone(&map),
                                    space_id,
                                },
                            )
                        }
                    }
                    _ = cleanup_interval.tick() => {
                        let one_week_ago = timestamp() - 60 * 60 * 24 * 7;
                        let map = Arc::make_mut(&mut map);
                        map.retain(|_, status| {
                            use crate::events::models::StatusKind;
                            status.kind != StatusKind::Offline || status.timestamp > one_week_ago
                        });
                    }
                    received = rx.recv() => {
                        match received {
                            Some(Action::Update(user_id, status)) => {
                                let kind = status.kind;
                                if let Some(existing) = Arc::make_mut(&mut map).insert(user_id, status) {
                                    if existing.kind == kind {
                                        continue;
                                    }
                                    Update::transient(
                                        space_id,
                                        UpdateBody::StatusMap {
                                            status_map: Arc::clone(&map),
                                            space_id,
                                        },
                                    )
                                }
                            }
                            Some(Action::Query(sender)) => {
                                let _ = sender.send(map.clone());
                            }
                            None => {
                                break;
                            }
                        }
                    }
                }
            }
        });

        Self { tx, join_handle }
    }

    pub fn update(&self, user_id: Uuid, status: UserStatus) {
        if self.tx.try_send(Action::Update(user_id, status)).is_err() {
            tracing::warn!("Failed to send status update for user {}", user_id);
        }
    }
    pub fn query(&self) -> tokio::sync::oneshot::Receiver<Arc<HashMap<Uuid, UserStatus>>> {
        let (sender, receiver) = tokio::sync::oneshot::channel();
        if self.tx.try_send(Action::Query(sender)).is_err() {
            tracing::warn!("Failed to send status query");
        }
        receiver
    }
}
