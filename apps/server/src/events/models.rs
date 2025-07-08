use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use super::status::StatusMap;

pub enum DbEventType {
    Joined,
    Left,
    NewMaster,
    NewAdmin,
}

pub struct DbEvent {
    pub id: Uuid,
    pub kind: DbEventType,
    pub channel_id: Option<Uuid>,
    pub space_id: Option<Uuid>,
    pub receiver_id: Option<Uuid>,
    pub payload: JsonValue,
    pub created: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StatusKind {
    Offline,
    Away,
    Online,
}

#[derive(Serialize, Deserialize, Debug, Clone, specta::Type)]
pub struct UserStatus {
    pub timestamp: i64,
    pub kind: StatusKind,
    pub focus: Vec<Uuid>,
}

pub async fn space_users_status(space_id: Uuid) -> Option<StatusMap> {
    let manager = crate::events::context::store().get_manager(&space_id)?;
    manager.query_status().await.ok()
}
