use chrono::prelude::*;
use quick_cache::sync::Cache;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

use crate::cache::CacheItem;
use crate::channels::api::{ChannelMemberWithUser, ChannelWithMaybeMember, ChannelWithMember};
use crate::db;
use crate::error::{row_not_found, ModelError};
use crate::spaces::{Space, SpaceMember};
use crate::users::User;
use crate::utils::merge_blank;
use std::collections::HashMap;
use std::sync::LazyLock;

#[derive(
    Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, TS, sqlx::Type,
)]
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

pub static CHANNEL_CACHE: LazyLock<Cache<Uuid, Channel>> = LazyLock::new(|| Cache::new(8192));

fn insert_cache(channel: &Channel) {
    CHANNEL_CACHE.insert(channel.id, channel.clone());
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
        CHANNEL_CACHE
            .get_or_insert_async(id, async {
                sqlx::query_file_scalar!("sql/channels/fetch_channel.sql", id)
                    .fetch_one(db)
                    .await
            })
            .await
            .map(Some)
            .or_else(row_not_found)
    }

    pub async fn get_by_id_list<'c, T: sqlx::PgExecutor<'c>, I: Iterator<Item = Uuid>>(
        db: T,
        id_list: I,
    ) -> Result<HashMap<Uuid, Channel>, sqlx::Error> {
        let mut query_ids: Vec<Uuid> = Vec::new();
        let mut result_map: HashMap<Uuid, Channel> = HashMap::new();
        for id in id_list {
            if let Some(user) = CHANNEL_CACHE.get(&id) {
                result_map.insert(user.id, user);
            } else {
                query_ids.push(id);
            }
        }
        let channels = sqlx::query_file_scalar!("sql/channels/get_by_id_list.sql", &*query_ids)
            .fetch_all(db)
            .await?;
        for channel in channels {
            CHANNEL_CACHE.insert(channel.id, channel.clone());
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
        use crate::spaces::models::SPACES_CACHE;

        if let Some(channel) = CHANNEL_CACHE.get(id) {
            if let Some(space) = SPACES_CACHE.get(&channel.space_id) {
                return Ok(Some((channel.clone(), space.payload)));
            }
        }
        let channel_and_space = sqlx::query_file!("sql/channels/fetch_channel_with_space.sql", id)
            .fetch_optional(db)
            .await?
            .map(|record| (record.channel, record.space));
        if let Some((channel, space)) = &channel_and_space {
            insert_cache(channel);
            SPACES_CACHE.insert(space.id, CacheItem::new(space.clone()));
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
            CHANNEL_CACHE.remove(id);
            if let Some(cache) = crate::events::context::get_cache().try_mailbox(id).await {
                cache.lock().await.remove_channel(id);
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

    pub async fn max_pos<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
    ) -> Result<Vec<(Uuid, f64)>, sqlx::Error> {
        let rows = sqlx::query_file!("sql/channels/channel_max_pos.sql")
            .fetch_all(db)
            .await?;
        Ok(rows
            .into_iter()
            .map(|row| (row.channel_id, row.max_pos))
            .collect())
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
            } else {
                log::error!(
                    "Channel {} not returned from `get_by_id_list` for user {}",
                    member.channel_id,
                    user_id
                );
            }
        }
        Ok(channel_with_members)
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
        ::std::boxed::Box<
            dyn ::std::error::Error + 'static + ::std::marker::Send + ::std::marker::Sync,
        >,
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

/// Avoid to read values from this cache.
///
/// This cache only used to speed up the query from the legacy code.
static USER_ALL_CHANNEL_MEMBER_CACHE: LazyLock<Cache<Uuid, Vec<ChannelMember>>> =
    LazyLock::new(|| Cache::new(8192));

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

        USER_ALL_CHANNEL_MEMBER_CACHE.remove(&new_member.user_id);
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
        USER_ALL_CHANNEL_MEMBER_CACHE
            .get_or_insert_async(&user_id, async {
                sqlx::query_file_scalar!(
                    "sql/channels/get_channel_member_list_by_user.sql",
                    user_id
                )
                .fetch_all(db)
                .await
            })
            .await
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
        user_id: &Uuid,
        channel_id: &Uuid,
        space_id: &Uuid,
    ) -> Result<bool, sqlx::Error> {
        if let Some(cache) = crate::events::context::get_cache()
            .try_mailbox(space_id)
            .await
        {
            if let Ok(mut cache) = cache.try_lock() {
                if let Some(members) = cache.members.get_mut(channel_id) {
                    if let Some(member) = members.map.get(user_id) {
                        return Ok(member.channel.is_master);
                    }
                }
            }
        }
        sqlx::query_file_scalar!("sql/channels/is_master.sql", user_id, channel_id)
            .fetch_one(db)
            .await
    }

    pub async fn get_with_space_member<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
        space_id: &Uuid,
    ) -> Result<Option<(ChannelMember, SpaceMember)>, sqlx::Error> {
        if let Some(cache) = crate::events::context::get_cache()
            .try_mailbox(space_id)
            .await
        {
            if let Ok(mut cache) = cache.try_lock() {
                if let Some(members) = cache.members.get_mut(channel_id) {
                    if let Some(member) = members.map.get(user_id) {
                        return Ok(Some((member.channel.clone(), member.space.clone())));
                    }
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
        if let Some(cache) = crate::events::context::get_cache()
            .try_mailbox(&space_id)
            .await
        {
            if let Ok(mut cache) = cache.try_lock() {
                if let Some(members) = cache.members.get_mut(&channel_id) {
                    if let Some(member) = members.map.get(&user_id) {
                        return Ok(Some(member.channel.clone()));
                    }
                }
            }
        }
        ChannelMember::get_from_db(db, user_id, space_id, channel_id).await
    }

    pub async fn get_from_db<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        space_id: Uuid,
        channel_id: Uuid,
    ) -> Result<Option<ChannelMember>, sqlx::Error> {
        let channel_member =
            sqlx::query_file_scalar!("sql/channels/get_channel_member.sql", &user_id, &channel_id)
                .fetch_optional(db)
                .await?;
        Member::load_to_cache(space_id, channel_id);
        Ok(channel_member)
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
            USER_ALL_CHANNEL_MEMBER_CACHE.remove(&user_id);
            if let Some(cache) = crate::events::context::get_cache()
                .try_mailbox(&space_id)
                .await
            {
                cache
                    .lock()
                    .await
                    .remove_member_from_channel(&channel_id, &user_id);
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
            USER_ALL_CHANNEL_MEMBER_CACHE.remove(&user_id);
            if let Some(cache) = crate::events::context::get_cache()
                .try_mailbox(&space_id)
                .await
            {
                cache.lock().await.remove_member(&user_id);
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
        USER_ALL_CHANNEL_MEMBER_CACHE.remove(&user_id);
        if let Some(channel_member) = channel_member.clone() {
            tokio::spawn(async move {
                if let Some(cache) = crate::events::context::get_cache()
                    .try_mailbox(&space_id)
                    .await
                {
                    cache.lock().await.update_channel_member(channel_member);
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
            USER_ALL_CHANNEL_MEMBER_CACHE.remove(&channel_member.user_id);
            tokio::spawn(async move {
                if let Some(cache) = crate::events::context::get_cache()
                    .try_mailbox(&channel_member.channel_id)
                    .await
                {
                    cache.lock().await.update_channel_member(channel_member);
                }
            });
        }
        Ok(channel_member)
    }
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
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
        let cache = crate::events::context::get_cache();
        if let Some(cache) = cache.try_mailbox(&space_id).await {
            if let Ok(mut cache) = cache.try_lock() {
                if let Some(members) = cache.members.get_mut(&channel_id) {
                    return Ok(members.map.values().cloned().collect());
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
        use std::time::Instant;
        let time_before_got_cache = Instant::now();
        let mailbox = crate::events::context::get_cache().mailbox(&space_id).await;
        if let Ok(cache) = mailbox.try_lock() {
            if let Some(members_cache) = cache.members.get(&channel_id) {
                if members_cache.instant > time_before_got_cache {
                    return Ok(members_cache.map.values().cloned().collect());
                }
            }
        }
        let members =
            sqlx::query_file_as!(Member, "sql/channels/get_member_by_channel.sql", channel_id)
                .fetch_all(db)
                .await?;
        let mut cache = mailbox.lock().await;
        cache.members.insert(
            channel_id,
            crate::events::context::Members {
                map: members
                    .iter()
                    .cloned()
                    .map(|member| (member.channel.user_id, member))
                    .collect(),
                instant: Instant::now(),
            },
        );
        drop(cache);
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
