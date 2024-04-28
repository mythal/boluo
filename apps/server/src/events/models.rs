use chrono::prelude::*;
use serde_json::Value as JsonValue;
use uuid::Uuid;

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
