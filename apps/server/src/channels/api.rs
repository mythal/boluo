use super::models::{Channel, ChannelMember};
use crate::channels::models::Member;
use crate::spaces::Space;
use crate::users::User;
use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct CreateChannel {
    pub space_id: Uuid,
    pub name: String,
    #[serde(default)]
    pub character_name: String,
    pub default_dice_type: Option<String>,
    pub is_public: bool,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
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
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct CheckChannelName {
    pub space_id: Uuid,
    pub name: String,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EditChannelMember {
    pub channel_id: Uuid,
    pub character_name: Option<String>,
    pub text_color: Option<String>,
}

#[derive(Serialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ChannelWithRelated {
    pub channel: Channel,
    pub members: Vec<Member>,
    pub space: Space,
    pub color_list: HashMap<Uuid, String>,
    pub heartbeat_map: HashMap<Uuid, i64>,
    pub encoded_events: Vec<String>,
}

#[derive(Serialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ChannelWithMember {
    pub channel: Channel,
    pub member: ChannelMember,
}

#[derive(Serialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ChannelMemberWithUser {
    pub member: ChannelMember,
    pub user: User,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct JoinChannel {
    pub channel_id: Uuid,
    #[serde(default)]
    pub character_name: String,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct AddChannelMember {
    pub channel_id: Uuid,
    pub user_id: Uuid,
    #[serde(default)]
    pub character_name: String,
}

#[derive(Deserialize, Debug, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Export {
    pub channel_id: Uuid,
    #[serde(default)]
    pub after: Option<DateTime<Utc>>,
}
