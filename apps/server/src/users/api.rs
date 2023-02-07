use super::User;
use crate::channels::api::ChannelWithMember;
use crate::spaces::api::SpaceWithMember;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct QueryUser {
    pub id: Option<Uuid>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct CheckEmailExists {
    pub email: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct CheckUsernameExists {
    pub username: String,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    enter_send: bool,
    #[serde(default)]
    expand_dice: bool,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct GetMe {
    pub user: User,
    #[ts(type = "unknown")]
    pub settings: serde_json::Value,
    pub my_channels: Vec<ChannelWithMember>,
    pub my_spaces: Vec<SpaceWithMember>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Register {
    pub email: String,
    pub username: String,
    pub nickname: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Login {
    pub username: String,
    pub password: String,
    #[serde(default)]
    pub with_token: bool,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct LoginReturn {
    pub me: GetMe,
    pub token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditUser {
    pub nickname: Option<String>,
    pub bio: Option<String>,
    pub avatar: Option<Uuid>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ResetPassword {
    pub email: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ResetPasswordConfirm {
    pub token: String,
    pub password: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ResetPasswordTokenCheck {
    pub token: String,
}
