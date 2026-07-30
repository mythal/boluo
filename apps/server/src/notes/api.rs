use serde::Deserialize;
use shared_types::messages::Entities;
use uuid::Uuid;

use crate::spaces::AccessPolicy;

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct QueryNote {
    pub space_id: Uuid,
    pub note_id: Uuid,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListNotes {
    pub space_id: Uuid,
    #[serde(default)]
    pub include_archived: bool,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateNote {
    pub space_id: Uuid,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub entities: Entities,
    pub access_policy: AccessPolicy,
    pub access_channel_id: Option<Uuid>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditNote {
    pub space_id: Uuid,
    pub note_id: Uuid,
    #[specta(type = f64)]
    pub expected_revision: i64,
    pub title: String,
    pub keywords: Vec<String>,
    pub tags: Vec<String>,
    pub text: String,
    #[serde(default)]
    pub entities: Entities,
    pub access_policy: AccessPolicy,
    pub access_channel_id: Option<Uuid>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveNote {
    pub space_id: Uuid,
    pub note_id: Uuid,
    #[specta(type = f64)]
    pub expected_revision: i64,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RestoreNote {
    pub space_id: Uuid,
    pub note_id: Uuid,
    #[specta(type = f64)]
    pub expected_revision: i64,
}
