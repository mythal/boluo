use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, specta::Type)]
pub struct Token {
    pub token: Option<String>,
}
