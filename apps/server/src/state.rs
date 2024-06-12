use dashmap::DashMap;
use std::sync::OnceLock;
use uuid::Uuid;

use crate::spaces::Space;

#[derive(Debug, Clone)]
pub struct SpaceState {
    pub info: Space,
}

pub enum SpaceAction {
    Init(SpaceState),
}

static SPACE_STATE_MAP: OnceLock<DashMap<Uuid, SpaceState>> = OnceLock::new();

pub fn get_space_state(id: Uuid) -> SpaceState {
    let space_state_map = SPACE_STATE_MAP.get_or_init(|| DashMap::new());
    todo!("get_space_state")
}
