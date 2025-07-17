use super::User;
use crate::channels::api::ChannelWithMember;
use crate::spaces::api::SpaceWithMember;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct QueryUser {
    pub id: Option<Uuid>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CheckEmailExists {
    pub email: String,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CheckUsernameExists {
    pub username: String,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    enter_send: bool,
    #[serde(default)]
    expand_dice: bool,
}

#[derive(Debug, Serialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetMe {
    pub user: User,
    pub settings: serde_json::Value,
    pub my_channels: Vec<ChannelWithMember>,
    pub my_spaces: Vec<SpaceWithMember>,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Register {
    pub email: String,
    pub username: String,
    pub nickname: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Login {
    pub username: String,
    pub password: String,
    #[serde(default)]
    pub with_token: bool,
}

#[derive(Debug, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LoginReturn {
    pub me: GetMe,
    pub token: Option<String>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditUser {
    pub nickname: Option<String>,
    pub bio: Option<String>,
    pub avatar: Option<Uuid>,
    pub default_color: Option<String>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ResetPassword {
    pub email: String,
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ResetPasswordConfirm {
    pub token: String,
    pub password: String,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ResetPasswordTokenCheck {
    pub token: String,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct VerifyEmail {
    pub token: String,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ResendEmailVerification {
    #[serde(default)]
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DiscourseConnect {
    pub sso: String,
    pub sig: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscoursePayload {
    pub nonce: String,
    pub return_sso_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscourseResponse {
    pub nonce: String,
    pub external_id: String,
    pub email: String,
    pub username: String,
    pub name: String,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub require_activation: bool,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResendEmailVerificationResult {
    AlreadyVerified,
    Sent,
}

#[derive(Debug, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EmailVerificationStatus {
    pub is_verified: bool,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RequestEmailChange {
    pub new_email: String,
    #[serde(default)]
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmEmailChange {
    pub token: String,
}
