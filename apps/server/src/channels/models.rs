use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

use crate::channels::api::{ChannelMemberWithUser, ChannelWithMaybeMember, ChannelWithMember};
use crate::error::ModelError;
use crate::spaces::{Space, SpaceMember};
use crate::users::User;
use crate::utils::merge_blank;
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, TS, sqlx::Type)]
#[ts(export)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(type_name = "text", rename_all = "snake_case")]
pub enum ChannelType {
    InGame,
    OutOfGame,
    Document,
}

impl ChannelType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ChannelType::InGame => "in_game",
            ChannelType::OutOfGame => "out_of_game",
            ChannelType::Document => "document",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::Type)]
#[sqlx(type_name = "channels")]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Channel {
    pub id: Uuid,
    pub name: String,
    pub topic: String,
    pub space_id: Uuid,
    pub created: DateTime<Utc>,
    pub is_public: bool,
    #[serde(skip)]
    pub deleted: bool,
    pub default_dice_type: String,
    pub default_roll_command: String,
    pub is_document: bool,
    #[serde(skip)]
    pub old_name: String,
    pub r#type: ChannelType,
}

impl Channel {
    pub async fn create<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
        name: &str,
        is_public: bool,
        default_dice_type: Option<&str>,
        _type: ChannelType,
    ) -> Result<Channel, ModelError> {
        use crate::validators;

        let name = merge_blank(name);
        validators::DISPLAY_NAME.run(&name)?;
        if let Some(default_dice_type) = default_dice_type {
            validators::DICE.run(default_dice_type)?;
        }
        sqlx::query_file_scalar!(
            "sql/channels/create_channel.sql",
            space_id,
            name,
            is_public,
            default_dice_type,
            _type.as_str(),
        )
        .fetch_one(db)
        .await
        .map_err(Into::into)
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<Option<Channel>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/fetch_channel.sql", id)
            .fetch_optional(db)
            .await
    }

    pub async fn get_by_name<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        name: &str,
    ) -> Result<Option<Channel>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/get_channel_by_name.sql", space_id, name)
            .fetch_optional(db)
            .await
    }

    pub async fn get_with_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Option<(Channel, Space)>, sqlx::Error> {
        sqlx::query_file!("sql/channels/fetch_channel_with_space.sql", id)
            .fetch_optional(db)
            .await
            .map(|row| row.map(|record| (record.channel, record.space)))
    }

    pub async fn get_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
    ) -> Result<Vec<Channel>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/get_by_space.sql", space_id)
            .fetch_all(db)
            .await
    }

    pub async fn get_by_space_and_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
        user_id: &Uuid,
    ) -> Result<Vec<ChannelWithMaybeMember>, sqlx::Error> {
        sqlx::query_file_as!(
            ChannelWithMaybeMember,
            "sql/channels/get_by_space_and_user.sql",
            space_id,
            user_id
        )
        .fetch_all(db)
        .await
    }

    pub async fn delete<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<u64, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/delete_channel.sql", id)
            .execute(db)
            .await
            .map(|r| r.rows_affected())
    }

    pub async fn edit<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
        name: Option<&str>,
        topic: Option<&str>,
        default_dice_type: Option<&str>,
        default_roll_command: Option<&str>,
        is_public: Option<bool>,
        is_document: Option<bool>,
        _type: Option<ChannelType>,
    ) -> Result<Channel, ModelError> {
        use crate::validators;

        let name = name.map(str::trim);
        if let Some(name) = name {
            validators::DISPLAY_NAME.run(name)?;
        }
        if let Some(topic) = topic {
            validators::TOPIC.run(topic)?;
        }
        if let Some(dice) = default_dice_type {
            validators::DICE.run(dice)?;
        }
        sqlx::query_file_scalar!(
            "sql/channels/edit_channel.sql",
            id,
            name,
            topic,
            default_dice_type,
            default_roll_command,
            is_public,
            is_document,
            _type.as_ref().map(ChannelType::as_str)
        )
        .fetch_one(db)
        .await
        .map_err(Into::into)
    }

    pub async fn max_pos<'c, T: sqlx::PgExecutor<'c>>(db: T) -> Result<Vec<(Uuid, f64)>, sqlx::Error> {
        let rows = sqlx::query_file!("sql/channels/channel_max_pos.sql")
            .fetch_all(db)
            .await?;
        Ok(rows.into_iter().map(|row| (row.channel_id, row.max_pos)).collect())
    }

    pub async fn get_by_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
    ) -> Result<Vec<ChannelWithMember>, sqlx::Error> {
        sqlx::query_file_as!(ChannelWithMember, "sql/channels/get_channels_by_user.sql", user_id)
            .fetch_all(db)
            .await
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ChannelMember {
    pub user_id: Uuid,
    pub channel_id: Uuid,
    pub join_date: DateTime<Utc>,
    pub character_name: String,
    pub is_master: bool,
    pub text_color: Option<String>,
    #[serde(skip)]
    pub is_joined: bool,
}

impl<'r> ::sqlx::decode::Decode<'r, ::sqlx::Postgres> for ChannelMember {
    fn decode(
        value: ::sqlx::postgres::PgValueRef<'r>,
    ) -> ::std::result::Result<
        Self,
        ::std::boxed::Box<dyn ::std::error::Error + 'static + ::std::marker::Send + ::std::marker::Sync>,
    > {
        let mut decoder = ::sqlx::postgres::types::PgRecordDecoder::new(value)?;
        let user_id = decoder.try_decode::<Uuid>()?;
        let channel_id = decoder.try_decode::<Uuid>()?;
        let join_date = decoder.try_decode::<DateTime<Utc>>()?;
        let character_name = decoder.try_decode::<String>()?;
        let text_color = decoder.try_decode::<Option<String>>()?;
        let is_joined = decoder.try_decode::<bool>()?;
        let is_master = decoder.try_decode::<bool>()?;
        ::std::result::Result::Ok(ChannelMember {
            user_id,
            channel_id,
            join_date,
            character_name,
            is_master,
            text_color,
            is_joined,
        })
    }
}
impl ::sqlx::Type<::sqlx::Postgres> for ChannelMember {
    fn type_info() -> ::sqlx::postgres::PgTypeInfo {
        ::sqlx::postgres::PgTypeInfo::with_name("channel_members")
    }
}

impl ChannelMember {
    pub async fn add_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
        character_name: &str,
        is_master: bool,
    ) -> Result<ChannelMember, ModelError> {
        use crate::validators;

        let character_name = character_name.trim();
        if !character_name.is_empty() {
            validators::CHARACTER_NAME.run(character_name)?;
        }
        sqlx::query_file!(
            "sql/channels/add_user_to_channel.sql",
            user_id,
            channel_id,
            character_name,
            is_master
        )
        .fetch_one(db)
        .await
        .map_err(Into::into)
        .map(|record| record.member)
    }

    pub async fn get_color_list<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
    ) -> Result<HashMap<Uuid, String>, sqlx::Error> {
        sqlx::query_file!("sql/channels/get_color_list.sql", channel_id)
            .fetch_all(db)
            .await
            .map(|rows| rows.into_iter().map(|row| (row.user_id, row.color)).collect())
    }

    pub async fn get_by_user_and_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
        user_id: &Uuid,
    ) -> Result<Vec<ChannelMember>, sqlx::Error> {
        sqlx::query_file_scalar!(
            "sql/channels/get_channel_member_list_by_user_and_space.sql",
            user_id,
            space_id
        )
        .fetch_all(db)
        .await
    }

    pub async fn get_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
    ) -> Result<HashMap<Uuid, Vec<ChannelMember>>, sqlx::Error> {
        let members = sqlx::query_file_scalar!("sql/channels/get_channel_member_list_by_space.sql", space_id)
            .fetch_all(db)
            .await?;
        let mut channel_member_map: HashMap<Uuid, Vec<ChannelMember>> = HashMap::new();
        for member in members {
            let id = member.channel_id;
            if let std::collections::hash_map::Entry::Vacant(e) = channel_member_map.entry(id) {
                e.insert(vec![member]);
            } else {
                let member_list = channel_member_map.get_mut(&id).unwrap();
                member_list.push(member);
            }
        }
        Ok(channel_member_map)
    }

    pub async fn get_by_channel<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel: &Uuid,
        include_leave: bool,
    ) -> Result<Vec<ChannelMemberWithUser>, sqlx::Error> {
        sqlx::query_file_as!(
            ChannelMemberWithUser,
            "sql/channels/get_channel_member_list.sql",
            channel,
            include_leave
        )
        .fetch_all(db)
        .await
    }

    pub async fn is_master<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
    ) -> Result<bool, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/is_master.sql", user_id, channel_id)
            .fetch_one(db)
            .await
    }

    pub async fn get_with_space_member<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
    ) -> Result<Option<(ChannelMember, SpaceMember)>, sqlx::Error> {
        sqlx::query_file!("sql/channels/get_with_space_member.sql", user_id, channel_id)
            .fetch_optional(db)
            .await
            .map(|row| row.map(|record| (record.channel, record.space)))
    }

    pub async fn get<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user: &Uuid,
        channel: &Uuid,
    ) -> Result<Option<ChannelMember>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/get_channel_member.sql", user, channel)
            .fetch_optional(db)
            .await
    }

    pub async fn remove_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
    ) -> Result<u64, sqlx::Error> {
        sqlx::query_file!("sql/channels/remove_user_from_channel.sql", user_id, channel_id)
            .execute(db)
            .await
            .map(|r| r.rows_affected())
    }

    pub async fn remove_user_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        space_id: &Uuid,
    ) -> Result<Vec<Uuid>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/remove_user_by_space.sql", user_id, space_id)
            .fetch_all(db)
            .await
    }

    pub async fn edit<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        channel_id: Uuid,
        character_name: Option<&str>,
        text_color: Option<&str>,
    ) -> Result<Option<ChannelMember>, ModelError> {
        use crate::validators;
        let character_name = character_name.map(str::trim);
        let text_color = text_color.map(str::trim);
        if let Some(text_color) = text_color {
            validators::HEX_COLOR.run(text_color)?;
        }
        if let Some(character_name) = character_name {
            if !character_name.is_empty() {
                validators::CHARACTER_NAME.run(character_name)?;
            }
        }
        sqlx::query_file_scalar!(
            "sql/channels/edit_member.sql",
            user_id,
            channel_id,
            character_name,
            text_color
        )
        .fetch_optional(db)
        .await
        .map_err(Into::into)
    }

    pub async fn set_name<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
        character_name: &str,
    ) -> Result<Option<ChannelMember>, ModelError> {
        ChannelMember::edit(db, *user_id, *channel_id, Some(character_name), None).await
    }

    pub async fn set_color<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
        color: &str,
    ) -> Result<Option<ChannelMember>, ModelError> {
        ChannelMember::edit(db, *user_id, *channel_id, None, Some(color)).await
    }

    pub async fn set_master<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
        is_master: bool,
    ) -> Result<Option<ChannelMember>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/set_master.sql", user_id, channel_id, is_master)
            .fetch_optional(db)
            .await
    }
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Member {
    pub channel: ChannelMember,
    pub space: SpaceMember,
    pub user: User,
}

impl Member {
    pub async fn get_by_channel<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: Uuid,
    ) -> Result<Vec<Member>, sqlx::Error> {
        sqlx::query_file_as!(
            Member,
            "sql/channels/get_members_information_by_channel.sql",
            channel_id,
        )
        .fetch_all(db)
        .await
    }
}
