use serde::Deserialize;
use uuid::Uuid;

use super::models::Entities;

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NewMessage {
    pub message_id: Option<Uuid>,
    pub preview_id: Option<Uuid>,
    pub channel_id: Uuid,
    pub name: String,
    pub text: String,
    pub entities: Entities,
    pub in_game: bool,
    pub is_action: bool,
    pub media_id: Option<Uuid>,
    pub whisper_to_users: Option<Vec<Uuid>>,
    pub pos: Option<(i32, i32)>,
    #[serde(default)]
    pub color: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditMessage {
    pub message_id: Uuid,
    pub name: String,
    pub text: String,
    pub entities: Entities,
    pub in_game: bool,
    pub is_action: bool,
    pub media_id: Option<Uuid>,
    #[serde(default)]
    pub color: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MessageMoveToMode {
    Top,
    Bottom,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MoveMessageBetween {
    pub message_id: Uuid,
    #[allow(clippy::type_complexity)]
    pub range: (Option<(i32, i32)>, Option<(i32, i32)>),
    pub channel_id: Uuid,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetMessagesByChannel {
    pub channel_id: Uuid,
    pub before: Option<f64>,
    pub limit: Option<i64>,
}
