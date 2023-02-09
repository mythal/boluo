use serde::Deserialize;
use serde_json::Value as JsonValue;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct NewMessage {
    pub message_id: Option<Uuid>,
    pub channel_id: Uuid,
    pub name: String,
    pub text: String,
    #[ts(type = "Array<unknown>")]
    pub entities: Vec<JsonValue>,
    pub in_game: bool,
    pub is_action: bool,
    pub media_id: Option<Uuid>,
    pub whisper_to_users: Option<Vec<Uuid>>,
    pub pos: Option<f64>,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EditMessage {
    pub message_id: Uuid,
    pub name: Option<String>,
    pub text: Option<String>,
    #[ts(type = "Array<unknown> | undefined")]
    pub entities: Option<Vec<JsonValue>>,
    pub in_game: Option<bool>,
    pub is_action: Option<bool>,
    pub media_id: Option<Uuid>,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MessageMoveToMode {
    Top,
    Bottom,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct MoveMessageBetween {
    pub message_id: Uuid,
    pub range: (Option<f64>, Option<f64>),
    pub channel_id: Uuid,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct GetMessagesByChannel {
    pub channel_id: Uuid,
    pub before: Option<f64>,
    pub limit: Option<i32>,
}
