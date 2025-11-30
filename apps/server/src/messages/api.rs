use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Message;
use super::models::Entities;

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NewMessage {
    #[serde(default)]
    pub message_id: Option<Uuid>,
    #[serde(default)]
    pub preview_id: Option<Uuid>,
    pub channel_id: Uuid,
    pub name: String,
    pub text: String,
    #[serde(default)]
    pub entities: Entities,
    pub in_game: bool,
    #[serde(default)]
    pub is_action: bool,
    #[serde(default)]
    pub media_id: Option<Uuid>,
    #[serde(default)]
    pub whisper_to_users: Option<Vec<Uuid>>,
    #[serde(default)]
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
    #[serde(default)]
    pub entities: Entities,
    #[serde(default)]
    pub in_game: bool,
    #[serde(default)]
    pub is_action: bool,
    #[serde(default)]
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
    /// The original position of the message, at the time of the client sending the request.
    #[serde(default)]
    pub expect_pos: Option<(i32, i32)>,
    pub channel_id: Uuid,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetMessagesByChannel {
    pub channel_id: Uuid,
    pub before: Option<f64>,
    pub limit: Option<i64>,
}

#[derive(Deserialize, Debug, Clone, Copy, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum SearchDirection {
    Asc,
    Desc,
}

fn default_search_direction() -> SearchDirection {
    SearchDirection::Desc
}

#[derive(Deserialize, Debug, Clone, Copy, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SearchFilter {
    All,
    InGame,
    OutOfGame,
}

fn default_search_filter() -> SearchFilter {
    SearchFilter::All
}

#[derive(Deserialize, Debug, Clone, Copy, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SearchNameFilter {
    NameOnly,
    All,
    TextOnly,
}

fn default_search_name_filter() -> SearchNameFilter {
    SearchNameFilter::All
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchMessagesParams {
    pub channel_id: Uuid,
    pub keyword: String,
    #[serde(default)]
    pub pos: Option<f64>,
    #[serde(default = "default_search_direction")]
    pub direction: SearchDirection,
    #[serde(default)]
    pub include_archived: bool,
    #[serde(default = "default_search_filter")]
    pub filter: SearchFilter,
    #[serde(default = "default_search_name_filter")]
    pub name_filter: SearchNameFilter,
}

#[derive(Serialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchMessagesResult {
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_pos: Option<f64>,
    pub scanned: usize,
    pub matched: usize,
}
