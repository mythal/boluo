use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Token {
    pub token: Uuid,
    #[specta(type = f64)]
    pub issued_at: i64,
}
