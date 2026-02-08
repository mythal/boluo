use std::collections::HashMap;
use std::time::{Duration, Instant};

use tokio::sync::mpsc;
use uuid::Uuid;

use crate::channels::models::Member;

use super::members::Action as MembersAction;
use super::members::MembersCache;

const MEMBERS_REFRESH_COOLDOWN: Duration = Duration::from_secs(60 * 5);

pub(super) enum MembersCommand {
    Action(MembersAction),
    Refresh { channel_id: Uuid },
    TouchActivity,
}

struct MembersRefreshGate {
    last_refresh_at: Instant,
    last_event_at: Instant,
}

pub(super) fn spawn(space_id: Uuid) -> mpsc::Sender<MembersCommand> {
    let (tx, mut rx) = mpsc::channel::<MembersCommand>(1024);
    tokio::spawn(async move {
        let mut members_state = MembersCache::new();
        let mut members_refresh_gate: HashMap<Uuid, MembersRefreshGate, ahash::RandomState> =
            HashMap::with_hasher(ahash::RandomState::new());
        let mut last_event_at: Option<Instant> = None;

        while let Some(command) = rx.recv().await {
            match command {
                MembersCommand::Action(action) => {
                    if let MembersAction::RemoveChannel(channel_id) = &action {
                        members_refresh_gate.remove(channel_id);
                    }
                    members_state.update(action);
                }
                MembersCommand::TouchActivity => {
                    last_event_at = Some(Instant::now());
                }
                MembersCommand::Refresh { channel_id } => {
                    let now = Instant::now();
                    let should_refresh = if let Some(event_at) = last_event_at {
                        if let Some(state) = members_refresh_gate.get(&channel_id) {
                            if now.duration_since(state.last_refresh_at) < MEMBERS_REFRESH_COOLDOWN
                            {
                                false
                            } else {
                                event_at > state.last_event_at
                            }
                        } else {
                            true
                        }
                    } else {
                        false
                    };

                    if should_refresh {
                        if let Some(event_at) = last_event_at {
                            members_refresh_gate.insert(
                                channel_id,
                                MembersRefreshGate {
                                    last_refresh_at: now,
                                    last_event_at: event_at,
                                },
                            );
                        }
                        Member::load_to_cache(space_id, channel_id);
                    }
                }
            }
        }
    });
    tx
}
