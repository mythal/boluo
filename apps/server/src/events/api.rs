use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Serialize, specta::Type)]
pub struct Token {
    pub token: Uuid,
}
