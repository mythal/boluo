use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Upload {
    pub filename: String,
    pub mime_type: Option<String>,
    #[serde(default)]
    pub size: usize,
}

#[derive(Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MediaQuery {
    pub filename: Option<String>,
    pub id: Option<Uuid>,
    #[serde(default)]
    pub download: bool,
}

#[derive(Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PreSign {
    pub filename: String,
    pub mime_type: String,
    pub size: i32,
}

#[derive(Deserialize, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PreSignResult {
    pub url: String,
    pub media_id: Uuid,
}
