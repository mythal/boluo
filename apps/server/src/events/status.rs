use std::{collections::BTreeMap, time::Duration};

use uuid::Uuid;

use super::{models::UserStatus, types::UpdateBody, Update};

pub enum Action {
    Update(Uuid, UserStatus),
    Query(tokio::sync::oneshot::Sender<BTreeMap<Uuid, UserStatus>>),
}

pub struct StatusActor {
    tx: tokio::sync::mpsc::Sender<Action>,
    join_handle: tokio::task::JoinHandle<()>,
}

impl StatusActor {
    pub fn new(space_id: Uuid) -> Self {
        let (tx, mut rx) = tokio::sync::mpsc::channel(128);

        let join_handle = tokio::spawn(async move {
            let mut map: BTreeMap<Uuid, UserStatus> = BTreeMap::new();

            let mut interval = tokio::time::interval(Duration::from_secs(6));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        if !map.is_empty() {
                            Update::transient(
                                space_id,
                                UpdateBody::StatusMap {
                                    status_map: map.clone(),
                                    space_id,
                                },
                            )
                        }
                    }
                    received = rx.recv() => {
                        match received {
                            Some(Action::Update(user_id, status)) => {
                                let kind = status.kind;
                                if let Some(existing) = map.insert(user_id, status) {
                                    if existing.kind == kind {
                                        continue;
                                    }
                                    Update::transient(
                                        space_id,
                                        UpdateBody::StatusMap {
                                            status_map: map.clone(),
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
            log::warn!("Failed to send status update for user {}", user_id);
        }
    }
    pub fn query(&self) -> tokio::sync::oneshot::Receiver<BTreeMap<Uuid, UserStatus>> {
        let (sender, receiver) = tokio::sync::oneshot::channel();
        if self.tx.try_send(Action::Query(sender)).is_err() {
            log::warn!("Failed to send status query");
        }
        receiver
    }
}
