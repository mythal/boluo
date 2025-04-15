use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::channels::ChannelType;
use crate::events::models::UserStatus;

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateSpace {
    pub name: String,
    pub password: Option<String>,
    pub description: String,
    pub default_dice_type: Option<String>,
    pub first_channel_name: String,
    pub first_channel_type: Option<ChannelType>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct QuerySpace {
    pub id: Uuid,
    pub token: Option<Uuid>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct JoinSpace {
    pub space_id: Uuid,
    pub token: Option<Uuid>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct KickFromSpace {
    pub space_id: Uuid,
    pub user_id: Uuid,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchParams {
    pub search: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditSpace {
    pub space_id: Uuid,
    pub name: Option<String>,
    pub description: Option<String>,
    pub default_dice_type: Option<String>,
    pub explorable: Option<bool>,
    pub is_public: Option<bool>,
    pub allow_spectator: Option<bool>,
    #[serde(default)]
    pub grant_admins: Vec<Uuid>,
    #[serde(default)]
    pub remove_admins: Vec<Uuid>,
}

#[derive(Serialize, Debug, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SpaceWithRelated {
    pub space: super::Space,
    pub members: HashMap<Uuid, super::models::SpaceMemberWithUser>,
    pub channels: Vec<crate::channels::Channel>,
    pub channel_members: HashMap<Uuid, Vec<crate::channels::ChannelMember>>,
    pub users_status: HashMap<Uuid, UserStatus>,
}

#[derive(Serialize, Debug, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SpaceWithMember {
    pub space: super::Space,
    pub member: super::SpaceMember,
    pub user: crate::users::User,
}
