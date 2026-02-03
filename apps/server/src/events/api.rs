use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Token {
    pub token: Uuid,
    pub issued_at: i64,
}

#[derive(Deserialize, Serialize, Default, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MakeToken {
    #[serde(default)]
    pub space_id: Option<Uuid>,
    #[serde(default)]
    pub user_id: Option<Uuid>,
}
