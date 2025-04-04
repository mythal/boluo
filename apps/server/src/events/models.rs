use std::collections::HashMap;

use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use ts_rs::TS;
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

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, TS)]
#[ts(export)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StatusKind {
    Offline,
    Away,
    Online,
}

#[derive(Serialize, Deserialize, Debug, Clone, TS)]
#[ts(export)]
pub struct UserStatus {
    #[ts(type = "number")]
    pub timestamp: i64,
    pub kind: StatusKind,
    pub focus: Vec<Uuid>,
}

pub async fn space_users_status(space_id: Uuid) -> Option<HashMap<Uuid, UserStatus>> {
    let mailbox = crate::events::context::get_cache()
        .try_mailbox(&space_id)
        .await?;
    let mailbox = mailbox.try_lock().ok()?;
    Some(mailbox.status.clone())
}
