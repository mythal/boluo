use serde::Deserialize;
use uuid::Uuid;

use super::models::{NoteType, NoteVisibility};

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Payload for creating a note.
pub struct CreateNote {
    pub space_id: Uuid,
    #[serde(rename = "type")]
    pub note_type: NoteType,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub content: String,
    pub visibility: NoteVisibility,
    #[serde(default)]
    pub visible_to: Vec<Uuid>,
    #[serde(default)]
    pub everyone_can_edit: bool,
    #[serde(default)]
    pub track_history: bool,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Payload for editing a note.
pub struct EditNote {
    pub note_id: Uuid,
    #[serde(rename = "type")]
    pub note_type: Option<NoteType>,
    pub title: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub content: Option<String>,
    pub visibility: Option<NoteVisibility>,
    pub visible_to: Option<Vec<Uuid>>,
    pub everyone_can_edit: Option<bool>,
    pub track_history: Option<bool>,
}
