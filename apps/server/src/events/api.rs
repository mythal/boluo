use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Deserialize, Serialize, TS)]
#[ts(export)]
pub struct Token {
    pub token: Option<String>,
}
