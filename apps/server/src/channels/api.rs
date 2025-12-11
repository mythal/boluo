use super::{
    ChannelType,
    models::{Channel, ChannelMember},
};
use crate::spaces::Space;
use crate::users::User;
use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Serialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MemberWithUser {
    pub channel: ChannelMember,
    pub space: crate::spaces::SpaceMember,
    pub user: User,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateChannel {
    pub space_id: Uuid,
    pub name: String,
    #[serde(default)]
    pub character_name: String,
    pub default_dice_type: Option<String>,
    pub is_public: bool,
    #[serde(rename = "type")]
    pub _type: Option<ChannelType>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditChannel {
    pub channel_id: Uuid,
    pub name: Option<String>,
    pub topic: Option<String>,
    pub default_dice_type: Option<String>,
    pub default_roll_command: Option<String>,
    #[serde(default)]
    pub grant_masters: Vec<Uuid>,
    #[serde(default)]
    pub remove_masters: Vec<Uuid>,
    pub is_public: Option<bool>,
    pub is_document: Option<bool>,
    pub is_archived: Option<bool>,
    #[serde(rename = "type")]
    pub _type: Option<ChannelType>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditChannelTopic {
    pub channel_id: Uuid,
    pub topic: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GrantOrRevoke {
    Grant,
    Revoke,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GrantOrRemoveChannelMaster {
    pub channel_id: Uuid,
    pub user_id: Uuid,
    pub grant_or_revoke: GrantOrRevoke,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CheckChannelName {
    pub space_id: Uuid,
    pub name: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditChannelMember {
    pub channel_id: Uuid,
    pub character_name: Option<String>,
    pub text_color: Option<String>,
}

#[derive(Serialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ChannelMembers {
    pub members: Vec<MemberWithUser>,
    pub color_list: HashMap<Uuid, String>,
    pub heartbeat_map: HashMap<Uuid, i64>,
    pub self_index: Option<usize>,
}

#[derive(Serialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ChannelWithRelated {
    pub channel: Channel,
    pub members: Vec<MemberWithUser>,
    pub space: Space,
    pub color_list: HashMap<Uuid, String>,
    pub heartbeat_map: HashMap<Uuid, i64>,
}

#[derive(Serialize, Debug, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ChannelWithMember {
    pub channel: Channel,
    pub member: ChannelMember,
}

#[derive(Serialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ChannelWithMaybeMember {
    pub channel: Channel,
    pub member: Option<ChannelMember>,
}

#[derive(Serialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ChannelMemberWithUser {
    pub member: ChannelMember,
    pub user: User,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct JoinChannel {
    pub channel_id: Uuid,
    #[serde(default)]
    pub character_name: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct KickFromChannel {
    pub space_id: Uuid,
    pub channel_id: Uuid,
    pub user_id: Uuid,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AddChannelMember {
    pub channel_id: Uuid,
    pub user_id: Uuid,
    #[serde(default)]
    pub character_name: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Export {
    pub channel_id: Uuid,
    #[serde(default)]
    pub after: Option<DateTime<Utc>>,
}
