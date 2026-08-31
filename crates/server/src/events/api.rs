use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub use shared_types::events::Token;

#[derive(Deserialize, Serialize, Default, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MakeToken {
    #[serde(default)]
    pub space_id: Option<Uuid>,
    #[serde(default)]
    pub user_id: Option<Uuid>,
}
