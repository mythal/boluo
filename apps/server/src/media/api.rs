use serde::Deserialize;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Upload {
    pub filename: String,
    pub mime_type: Option<String>,
}

#[derive(Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct MediaQuery {
    pub filename: Option<String>,
    pub id: Option<Uuid>,
    #[serde(default)]
    pub download: bool,
}
