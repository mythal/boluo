use crate::channels::ChannelMember;
use crate::db;
use crate::error::AppError;
use crate::events::Event;
use crate::{error::Find, redis};
use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Preview {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub channel_id: Uuid,
    pub parent_message_id: Option<Uuid>,
    pub name: String,
    pub media_id: Option<Uuid>,
    pub in_game: bool,
    pub is_action: bool,
    pub is_master: bool,
    pub clear: bool,
    pub text: Option<String>,
    pub whisper_to_users: Option<Vec<Uuid>>,
    #[ts(type = "Array<unknown>")]
    pub entities: Vec<JsonValue>,
    pub pos: f64,
    pub edit_for: Option<DateTime<Utc>>,
    pub edit: Option<PreviewEdit>,
}

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct PreviewEdit {
    pub time: DateTime<Utc>,
    pub p: i32,
    pub q: i32,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct PreviewPost {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub name: String,
    pub media_id: Option<Uuid>,
    pub in_game: bool,
    pub is_action: bool,
    pub text: Option<String>,
    #[serde(default)]
    pub clear: bool,
    #[ts(type = "Array<unknown>")]
    pub entities: Vec<JsonValue>,
    #[serde(default)]
    pub edit_for: Option<DateTime<Utc>>,
    #[serde(default)]
    pub edit: Option<PreviewEdit>,
}

impl PreviewPost {
    pub async fn broadcast(self, space_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let PreviewPost {
            id,
            channel_id,
            name,
            media_id,
            in_game,
            is_action,
            text,
            entities,
            mut edit_for,
            clear,
            edit,
        } = self;
        let pool = db::get().await;
        let mut conn = pool.acquire().await?;
        let mut redis_conn = redis::conn().await;
        let redis_conn = &mut redis_conn;
        let mut should_finish = false;
        if let Some(text) = text.as_ref() {
            if (text.trim().is_empty() || entities.is_empty()) && edit_for.is_none() {
                should_finish = true;
            }
        }
        let muted = text.is_none();
        let mut start = 0.0;
        if let Some(PreviewEdit { p, q, time }) = edit {
            start = p as f64 / q as f64;
            edit_for = Some(time);
        } else if edit_for.is_none() && !should_finish {
            let keep_seconds = if muted { 8 } else { 60 * 3 };
            start =
                crate::pos::pos(&mut conn, redis_conn, channel_id, id, keep_seconds).await? as f64;
        }
        let is_master = ChannelMember::get(&mut *conn, user_id, space_id, channel_id)
            .await
            .or_no_permission()?
            .is_master;
        let whisper_to_users = None;
        let preview = Box::new(Preview {
            id,
            sender_id: user_id,
            channel_id,
            parent_message_id: None,
            name,
            media_id,
            in_game,
            is_action,
            text,
            whisper_to_users,
            entities,
            is_master,
            edit_for,
            clear,
            pos: start,
            edit,
        });

        if should_finish {
            crate::pos::finished(redis_conn, channel_id, id).await?;
        }
        Event::message_preview(space_id, preview);
        Ok(())
    }
}
