use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

use super::Message;
use super::models::Entities;

pub use shared_types::messages::NewMessage;

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditMessage {
    #[serde(default)]
    pub space_id: Option<Uuid>,
    pub message_id: Uuid,
    #[serde(default)]
    pub attribution: Option<EditMessageAttribution>,
    #[serde(flatten)]
    pub legacy_attribution: LegacyEditAttribution,
    pub text: String,
    #[serde(default)]
    pub entities: Entities,
    #[serde(default)]
    pub is_action: bool,
    #[serde(default)]
    pub media_id: Option<Uuid>,
    /// The `modified` timestamp of the message at the time the client started editing it.
    #[serde(default)]
    #[specta(type = Option<String>)]
    #[serde(with = "time::serde::rfc3339::option")]
    pub expect_modified: Option<OffsetDateTime>,
}

#[derive(Deserialize, Debug, Default, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LegacyEditAttribution {
    /// Legacy sender name. New clients should use `attribution` instead.
    #[serde(default)]
    pub name: Option<String>,
    /// Legacy in-game state. New clients should use `attribution` instead.
    #[serde(default)]
    pub in_game: Option<bool>,
    /// Legacy sender color. New clients should use `attribution` instead.
    #[serde(default)]
    pub color: Option<String>,
}

impl LegacyEditAttribution {
    pub(super) fn is_supplied(&self) -> bool {
        self.name.is_some() || self.in_game.is_some() || self.color.is_some()
    }
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum EditMessageAttribution {
    Character {
        character_id: Uuid,
        portrait_id: Option<Uuid>,
    },
    Custom {
        name: String,
        color: String,
        in_game: bool,
    },
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
    #[serde(default)]
    pub space_id: Option<Uuid>,
    pub before: Option<f64>,
    #[specta(type = Option<f64>)]
    pub limit: Option<i64>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MessageIdQuery {
    pub id: Uuid,
    #[serde(default)]
    pub space_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::{EditMessage, EditMessageAttribution};

    #[test]
    fn edit_message_accepts_legacy_and_explicit_attribution_payloads() {
        let legacy: EditMessage = serde_json::from_value(serde_json::json!({
            "messageId": "018f6fd8-9897-7b29-9c3e-769dbb1d1c37",
            "name": "Player",
            "text": "Edited text"
        }))
        .expect("legacy EditMessage should deserialize");

        assert_eq!(legacy.space_id, None);
        assert_eq!(legacy.legacy_attribution.name.as_deref(), Some("Player"));
        assert!(legacy.attribution.is_none());

        let explicit: EditMessage = serde_json::from_value(serde_json::json!({
            "messageId": "018f6fd8-9897-7b29-9c3e-769dbb1d1c37",
            "text": "Edited text",
            "attribution": {
                "type": "character",
                "characterId": "018f6fd8-9897-7b29-9c3e-769dbb1d1c38",
                "portraitId": null
            }
        }))
        .expect("new EditMessage should deserialize");

        assert!(matches!(
            explicit.attribution,
            Some(EditMessageAttribution::Character {
                character_id,
                portrait_id: None,
            }) if character_id.to_string() == "018f6fd8-9897-7b29-9c3e-769dbb1d1c38"
        ));
    }
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
    #[serde(default)]
    pub space_id: Option<Uuid>,
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
    #[specta(type = f64)]
    pub scanned: usize,
    #[specta(type = f64)]
    pub matched: usize,
}
