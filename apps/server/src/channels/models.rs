use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::cache::{CacheType, CACHE};
use crate::channels::api::{ChannelMemberWithUser, ChannelWithMaybeMember, ChannelWithMember};
use crate::db;
use crate::error::ModelError;
use crate::events::context::StateError;
use crate::spaces::{Space, SpaceMember};
use crate::ttl::{fetch_entry, fetch_entry_optional, hour, minute, Lifespan, Mortal};
use crate::users::User;
use crate::utils::merge_blank;
use std::collections::HashMap;

#[derive(
    Debug,
    Clone,
    Copy,
    Serialize,
    Deserialize,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    specta::Type,
    sqlx::Type,
)]
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

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, sqlx::Type)]
#[sqlx(type_name = "channels")]
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

impl Lifespan for Channel {
    fn ttl_sec() -> u64 {
        hour::TWO
    }
}

fn insert_cache(channel: &Channel) {
    CACHE.Channel.insert(channel.id, channel.clone().into());
}

fn maybe_insert_cache(channel: &Option<Channel>) {
    if let Some(channel) = channel {
        insert_cache(channel);
    }
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
        .inspect(insert_cache)
        .map_err(Into::into)
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Option<Channel>, sqlx::Error> {
        fetch_entry_optional(&CACHE.Channel, *id, async move {
            sqlx::query_file_scalar!("sql/channels/fetch_channel.sql", id)
                .fetch_one(db)
                .await
                .map(Into::into)
        })
        .await
    }

    pub async fn get_by_id_list<'c, T: sqlx::PgExecutor<'c>, I: Iterator<Item = Uuid>>(
        db: T,
        id_list: I,
    ) -> Result<HashMap<Uuid, Channel>, sqlx::Error> {
        let mut query_ids: Vec<Uuid> = Vec::new();
        let mut result_map: HashMap<Uuid, Channel> = HashMap::new();
        for id in id_list {
            if let Some(channel) = CACHE.Channel.get(&id).and_then(Mortal::fresh_only) {
                result_map.insert(channel.id, channel);
            } else {
                query_ids.push(id);
            }
        }
        let channels = sqlx::query_file_scalar!("sql/channels/get_by_id_list.sql", &*query_ids)
            .fetch_all(db)
            .await?;
        for channel in channels {
            CACHE.Channel.insert(channel.id, channel.clone().into());
            result_map.insert(channel.id, channel);
        }
        Ok(result_map)
    }

    pub async fn get_by_name<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        name: &str,
    ) -> Result<Option<Channel>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/get_channel_by_name.sql", space_id, name)
            .fetch_optional(db)
            .await
            .inspect(maybe_insert_cache)
    }

    pub async fn get_with_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Option<(Channel, Space)>, sqlx::Error> {
        if let Some(channel) = CACHE.Channel.get(id).and_then(Mortal::fresh_only) {
            if let Some(space) = CACHE
                .Space
                .get(&channel.space_id)
                .and_then(Mortal::fresh_only)
            {
                return Ok(Some((channel, space)));
            }
        }
        let channel_and_space = sqlx::query_file!("sql/channels/fetch_channel_with_space.sql", id)
            .fetch_optional(db)
            .await?
            .map(|record| (record.channel, record.space));
        if let Some((channel, space)) = &channel_and_space {
            insert_cache(channel);
            CACHE.Space.insert(space.id, space.clone().into());
        }
        Ok(channel_and_space)
    }

    pub async fn get_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
    ) -> Result<Vec<Channel>, sqlx::Error> {
        let channels = sqlx::query_file_scalar!("sql/channels/get_by_space.sql", space_id)
            .fetch_all(db)
            .await?;
        for channel in &channels {
            insert_cache(channel);
        }
        Ok(channels)
    }

    pub async fn get_by_space_and_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
        user_id: &Uuid,
    ) -> Result<Vec<ChannelWithMaybeMember>, sqlx::Error> {
        let channel_list = sqlx::query_file_as!(
            ChannelWithMaybeMember,
            "sql/channels/get_by_space_and_user.sql",
            space_id,
            user_id
        )
        .fetch_all(db)
        .await?;
        for ChannelWithMaybeMember { channel, .. } in &channel_list {
            insert_cache(channel);
        }
        Ok(channel_list)
    }

    pub async fn delete<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<u64, sqlx::Error> {
        let affected = sqlx::query_file_scalar!("sql/channels/delete_channel.sql", id)
            .execute(db)
            .await
            .map(|r| r.rows_affected())?;
        if affected > 0 {
            CACHE.invalidate(CacheType::Channel, *id).await;
            let map = crate::events::context::store().mailboxes.pin();
            if let Some(mailbox_state) = map.get(id) {
                if let Err(StateError::TimeOut) = mailbox_state.remove_channel(*id) {
                    log::warn!("Failed to remove channel from mailbox state");
                }
            }
        }

        Ok(affected)
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
        .inspect(insert_cache)
        .map_err(Into::into)
    }

    pub async fn get_by_user(
        db: &mut sqlx::PgConnection,
        user_id: Uuid,
    ) -> Result<Vec<ChannelWithMember>, sqlx::Error> {
        let channel_member_list = ChannelMember::get_by_user(&mut *db, user_id).await?;
        let mut channels = Channel::get_by_id_list(
            db,
            channel_member_list.iter().map(|member| member.channel_id),
        )
        .await?;
        let mut channel_with_members = Vec::with_capacity(channel_member_list.len());
        for member in channel_member_list {
            if let Some(channel) = channels.remove(&member.channel_id) {
                channel_with_members.push(ChannelWithMember { channel, member });
            }
        }
        Ok(channel_with_members)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, sqlx::Type)]
#[sqlx(type_name = "channel_members")]
#[serde(rename_all = "camelCase")]
pub struct ChannelMember {
    pub user_id: Uuid,
    pub channel_id: Uuid,
    pub join_date: DateTime<Utc>,
    pub character_name: String,
    pub text_color: Option<String>,
    #[serde(skip)]
    pub is_joined: bool,
    pub is_master: bool,
}

#[derive(Default, Debug, Clone)]
pub struct ChannelMembers(pub Vec<ChannelMember>);

impl Lifespan for ChannelMembers {
    fn ttl_sec() -> u64 {
        minute::QUARTER
    }
}

impl ChannelMember {
    pub async fn add_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        channel_id: Uuid,
        space_id: Uuid,
        character_name: &str,
        is_master: bool,
    ) -> Result<ChannelMember, ModelError> {
        use crate::validators;

        let character_name = character_name.trim();
        if !character_name.is_empty() {
            validators::CHARACTER_NAME.run(character_name)?;
        }
        let new_member = sqlx::query_file!(
            "sql/channels/add_user_to_channel.sql",
            user_id,
            &channel_id,
            character_name,
            is_master
        )
        .fetch_one(db)
        .await
        .map(|record| record.member)?;

        CACHE
            .invalidate(CacheType::ChannelMembers, new_member.user_id)
            .await;
        Member::load_to_cache(space_id, channel_id);
        Ok(new_member)
    }

    pub async fn get_color_list<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
    ) -> Result<HashMap<Uuid, String>, sqlx::Error> {
        sqlx::query_file!("sql/channels/get_color_list.sql", channel_id)
            .fetch_all(db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| (row.user_id, row.color))
                    .collect()
            })
    }

    pub async fn get_by_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
    ) -> Result<Vec<ChannelMember>, sqlx::Error> {
        fetch_entry(&CACHE.ChannelMembers, user_id, async {
            sqlx::query_file_scalar!("sql/channels/get_channel_member_list_by_user.sql", user_id)
                .fetch_all(db)
                .await
                .map(|members| ChannelMembers(members))
        })
        .await
        .map(|members| members.0)
    }

    pub async fn get_by_channel<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel: &Uuid,
        include_leave: bool,
    ) -> Result<Vec<ChannelMemberWithUser>, sqlx::Error> {
        // TODO: use cache
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
        user_id: Uuid,
        channel_id: Uuid,
        space_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let map = crate::events::context::store().mailboxes.pin();
        if let Some(mailbox_state) = map.get(&space_id) {
            if let Ok(is_master) = mailbox_state.is_master(channel_id, user_id) {
                return Ok(is_master);
            }
        }
        sqlx::query_file_scalar!("sql/channels/is_master.sql", user_id, channel_id)
            .fetch_one(db)
            .await
    }

    pub async fn get_with_space_member<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        channel_id: Uuid,
        space_id: &Uuid,
    ) -> Result<Option<(ChannelMember, SpaceMember)>, sqlx::Error> {
        {
            let map = crate::events::context::store().mailboxes.pin();
            if let Some(mailbox_state) = map.get(space_id) {
                if let Ok(member) = mailbox_state.get_member(channel_id, user_id) {
                    return Ok(Some((member.channel.clone(), member.space.clone())));
                }
            }
        }
        sqlx::query_file!(
            "sql/channels/get_with_space_member.sql",
            user_id,
            channel_id
        )
        .fetch_optional(db)
        .await
        .map(|row| row.map(|record| (record.channel, record.space)))
    }

    pub async fn get<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        space_id: Uuid,
        channel_id: Uuid,
    ) -> Result<Option<ChannelMember>, sqlx::Error> {
        {
            let map = crate::events::context::store().mailboxes.pin();
            if let Some(mailbox_state) = map.get(&space_id) {
                if let Ok(member) = mailbox_state.get_member(channel_id, user_id) {
                    return Ok(Some(member.channel));
                }
            }
        }
        Member::get_by_channel(db, space_id, channel_id)
            .await
            .map(|members| {
                members
                    .into_iter()
                    .map(|member| member.channel)
                    .find(|member| member.user_id == user_id)
            })
    }

    pub async fn remove_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        channel_id: Uuid,
        space_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        let query_result = sqlx::query_file!(
            "sql/channels/remove_user_from_channel.sql",
            &user_id,
            &channel_id
        )
        .execute(db)
        .await?;
        if query_result.rows_affected() == 0 {
            return Err(sqlx::Error::RowNotFound);
        }
        tokio::spawn(async move {
            CACHE.invalidate(CacheType::ChannelMembers, user_id).await;
            let map = crate::events::context::store().mailboxes.pin();
            if let Some(mailbox_state) = map.get(&space_id) {
                mailbox_state.remove_member_from_channel(channel_id, user_id);
            }
        });
        Ok(())
    }

    pub async fn remove_user_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        space_id: Uuid,
    ) -> Result<Vec<Uuid>, sqlx::Error> {
        let ids =
            sqlx::query_file_scalar!("sql/channels/remove_user_by_space.sql", user_id, space_id)
                .fetch_all(db)
                .await?;

        tokio::spawn(async move {
            CACHE.invalidate(CacheType::ChannelMembers, user_id).await;
            let map = crate::events::context::store().mailboxes.pin();
            if let Some(mailbox_state) = map.get(&space_id) {
                mailbox_state.remove_member(&user_id);
            }
        });
        Ok(ids)
    }

    pub async fn edit<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        channel_id: Uuid,
        space_id: Uuid,
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
        let channel_member = sqlx::query_file_scalar!(
            "sql/channels/edit_member.sql",
            user_id,
            channel_id,
            character_name,
            text_color
        )
        .fetch_optional(db)
        .await?;
        CACHE.invalidate(CacheType::ChannelMembers, user_id).await;
        if let Some(channel_member) = channel_member.clone() {
            tokio::spawn(async move {
                let map = crate::events::context::store().mailboxes.pin();
                if let Some(mailbox_state) = map.get(&space_id) {
                    mailbox_state.update_channel_member(channel_member);
                }
            });
        }

        Ok(channel_member)
    }

    pub async fn set_name<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
        character_name: &str,
        space_id: Uuid,
    ) -> Result<Option<ChannelMember>, ModelError> {
        ChannelMember::edit(
            db,
            *user_id,
            *channel_id,
            space_id,
            Some(character_name),
            None,
        )
        .await
    }

    pub async fn set_color<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
        space_id: Uuid,
        color: &str,
    ) -> Result<Option<ChannelMember>, ModelError> {
        ChannelMember::edit(db, *user_id, *channel_id, space_id, None, Some(color)).await
    }

    pub async fn set_master<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
        space_id: Uuid,
        is_master: bool,
    ) -> Result<Option<ChannelMember>, sqlx::Error> {
        let channel_member = sqlx::query_file_scalar!(
            "sql/channels/set_master.sql",
            user_id,
            channel_id,
            is_master
        )
        .fetch_optional(db)
        .await?;
        if let Some(channel_member) = channel_member.clone() {
            CACHE
                .invalidate(CacheType::ChannelMembers, channel_member.user_id)
                .await;
            tokio::spawn(async move {
                let map = crate::events::context::store().mailboxes.pin();
                if let Some(mailbox_state) = map.get(&space_id) {
                    mailbox_state.update_channel_member(channel_member);
                }
            });
        }
        Ok(channel_member)
    }
}

#[derive(Debug, Serialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Member {
    pub channel: ChannelMember,
    pub space: SpaceMember,
}

impl Member {
    pub async fn get_by_channel<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        channel_id: Uuid,
    ) -> Result<Vec<Member>, sqlx::Error> {
        let store = crate::events::context::store();
        {
            let map = store.mailboxes.pin();
            if let Some(mailbox_state) = map.get(&space_id) {
                let members = mailbox_state.get_members_in_channel(channel_id);
                if !members.is_empty() {
                    return Ok(members);
                }
            }
        }
        Member::get_by_channel_from_db(db, space_id, channel_id).await
    }

    pub fn load_to_cache(space_id: Uuid, channel_id: Uuid) {
        tokio::spawn(async move {
            let db = db::get().await;
            let _ = Member::get_by_channel_from_db(&db, space_id, channel_id).await;
        });
    }

    pub async fn get_by_channel_from_db<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        channel_id: Uuid,
    ) -> Result<Vec<Member>, sqlx::Error> {
        let members =
            sqlx::query_file_as!(Member, "sql/channels/get_member_by_channel.sql", channel_id)
                .fetch_all(db)
                .await?;
        {
            let map = crate::events::context::store().mailboxes.pin();
            let mailbox_state = map.get_or_insert_with(space_id, Default::default);
            mailbox_state.set_members(&members);
        }
        Ok(members)
    }
}

pub async fn members_attach_user<'c, T: sqlx::PgExecutor<'c>>(
    db: T,
    members: Vec<Member>,
) -> Result<Vec<crate::channels::api::MemberWithUser>, sqlx::Error> {
    let mut users =
        User::get_by_id_list(db, members.iter().map(|member| member.channel.user_id)).await?;
    let mut members_with_user = Vec::with_capacity(members.len());
    for member in members {
        if let Some(user) = users.remove(&member.channel.user_id) {
            members_with_user.push(crate::channels::api::MemberWithUser {
                user,
                channel: member.channel,
                space: member.space,
            });
        }
    }
    Ok(members_with_user)
}
