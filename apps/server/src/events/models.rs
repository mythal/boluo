use chrono::prelude::*;
use postgres_types::FromSql;
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(FromSql)]
#[postgres(name = "channels")]
pub enum DbEventType {
    Joined,
    Left,
    NewMaster,
    NewAdmin,
}

#[derive(FromSql)]
#[postgres(name = "events")]
pub struct DbEvent {
    pub id: Uuid,
    #[postgres(name = "type")]
    pub kind: DbEventType,
    pub channel_id: Option<Uuid>,
    pub space_id: Option<Uuid>,
    pub receiver_id: Option<Uuid>,
    pub payload: JsonValue,
    pub created: DateTime<Utc>,
}
