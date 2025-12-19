use serde::Deserialize;
use uuid::Uuid;

use super::models::{CharacterVariable, CharacterVisibility};

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Query params for listing characters in a space.
pub struct ListCharacters {
    pub id: Uuid,
    #[serde(default)]
    pub include_archived: bool,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Query params for checking name/alias availability.
pub struct CheckCharacterName {
    pub space_id: Uuid,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub alias: Option<String>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Payload for creating a character.
pub struct CreateCharacter {
    pub space_id: Uuid,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub color: String,
    pub alias: Option<String>,
    pub image_id: Option<Uuid>,
    pub visibility: CharacterVisibility,
    #[serde(default)]
    pub is_archived: bool,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Payload for editing a character; `alias: Some("")` clears it.
pub struct EditCharacter {
    pub character_id: Uuid,
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub alias: Option<String>,
    pub image_id: Option<Uuid>,
    pub visibility: Option<CharacterVisibility>,
    pub is_archived: Option<bool>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Payload for creating a character variable.
pub struct CreateVariable {
    pub character_id: Uuid,
    pub key: String,
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub alias: Vec<String>,
    #[serde(default)]
    pub sort: i32,
    #[serde(default = "CharacterVariable::default_track_history")]
    pub track_history: bool,
    pub value: serde_json::Value,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Payload for editing a character variable.
pub struct EditVariable {
    pub character_id: Uuid,
    pub key: String,
    pub display_name: Option<String>,
    pub alias: Option<Vec<String>>,
    pub sort: Option<i32>,
    pub track_history: Option<bool>,
    pub value: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
    pub reason: Option<serde_json::Value>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Payload for deleting a character variable.
pub struct DeleteVariable {
    pub character_id: Uuid,
    pub key: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Query params for listing variable history by key.
pub struct VariableHistoryQuery {
    pub character_id: Uuid,
    pub key: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Query params for checking variable key/alias availability.
pub struct CheckVariableAvailability {
    pub character_id: Uuid,
    #[serde(default)]
    pub key: Option<String>,
    #[serde(default)]
    pub alias: Vec<String>,
}
