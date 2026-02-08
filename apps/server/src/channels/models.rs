use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use tracing::Instrument as _;
use uuid::Uuid;

use crate::cache::{CACHE, CacheType};
use crate::channels::api::{ChannelMemberWithUser, ChannelWithMaybeMember, ChannelWithMember};
use crate::db;
use crate::error::ModelError;
use crate::spaces::{Space, SpaceMember};
use crate::ttl::{Lifespan, Mortal, fetch_entry, fetch_entry_optional, hour, minute};
use crate::users::User;
use crate::utils::{is_false, merge_blank};
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
    #[serde(default, skip_serializing_if = "is_false")]
    pub is_archived: bool,
}

impl Lifespan for Channel {
    fn ttl_sec() -> u64 {
        hour::TWO
    }
}

#[derive(Default, Debug, Clone)]
pub struct SpacesChannels {
    pub channel_ids: Vec<Uuid>,
}

impl Lifespan for SpacesChannels {
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

fn insert_spaces_channels_cache(space_id: Uuid, channels: &[Channel]) {
    let channel_ids = channels.iter().map(|channel| channel.id).collect();
    CACHE
        .SpacesChannels
        .insert(space_id, SpacesChannels { channel_ids }.into());
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
        let channel = sqlx::query_file_scalar!(
            "sql/channels/create_channel.sql",
            space_id,
            name,
            is_public,
            default_dice_type,
            _type.as_str(),
        )
        .fetch_one(db)
        .await?;
        insert_cache(&channel);
        CACHE
            .invalidate(CacheType::SpacesChannels, channel.space_id)
            .await;
        Ok(channel)
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Option<Channel>, sqlx::Error> {
        fetch_entry_optional(&CACHE.Channel, *id, async move {
            sqlx::query_file_scalar!("sql/channels/fetch_channel.sql", id)
                .fetch_one(db)
                .await
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
        let space_id = *space_id;
        if let Some(space_channels) = CACHE
            .SpacesChannels
            .get(&space_id)
            .and_then(Mortal::fresh_only)
        {
            let mut cached_channels = Vec::with_capacity(space_channels.channel_ids.len());
            let mut all_channels_hit = true;
            for channel_id in space_channels.channel_ids {
                if let Some(channel) = CACHE.Channel.get(&channel_id).and_then(Mortal::fresh_only) {
                    cached_channels.push(channel);
                } else {
                    all_channels_hit = false;
                    break;
                }
            }
            if all_channels_hit {
                return Ok(cached_channels);
            }
        }

        let channels = sqlx::query_file_scalar!("sql/channels/get_by_space.sql", &space_id)
            .fetch_all(db)
            .await?;
        for channel in &channels {
            insert_cache(channel);
        }
        insert_spaces_channels_cache(space_id, &channels);
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

    pub async fn delete(
        db: &mut sqlx::PgConnection,
        id: &Uuid,
        space_id: &Uuid,
    ) -> Result<u64, sqlx::Error> {
        let affected = sqlx::query_file_scalar!("sql/channels/delete_channel.sql", id)
            .execute(&mut *db)
            .await
            .map(|r| r.rows_affected())?;
        if affected > 0 {
            let member_user_ids =
                sqlx::query_file_scalar!("sql/channels/get_joined_member_user_ids.sql", id)
                    .fetch_all(&mut *db)
                    .await?;

            let mut invalidate_tasks = Vec::with_capacity(member_user_ids.len() + 2);
            invalidate_tasks.push(CACHE.invalidate(CacheType::Channel, *id));
            invalidate_tasks.push(CACHE.invalidate(CacheType::SpacesChannels, *space_id));
            for user_id in member_user_ids {
                invalidate_tasks.push(CACHE.invalidate(CacheType::ChannelMembers, user_id));
            }
            futures::future::join_all(invalidate_tasks).await;

            if let Some(manager) = crate::events::context::store().get_manager(space_id) {
                if let Err(e) = manager.remove_channel(*id).await {
                    tracing::warn!(
                        error = ?e,
                        "Failed to remove channel from mailbox state"
                    );
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
        is_archived: Option<bool>,
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
            _type.as_ref().map(ChannelType::as_str),
            is_archived,
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
                .map(ChannelMembers)
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
        if let Some(manager) = crate::events::context::store().get_manager(&space_id) {
            if let Ok(Ok(is_master)) = manager.is_master(channel_id, user_id).await {
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
            if let Some(manager) = crate::events::context::store().get_manager(space_id) {
                if let Ok(Ok(Some(member))) = manager.get_member(channel_id, user_id).await {
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

    pub async fn get(
        db: &mut sqlx::PgConnection,
        user_id: Uuid,
        space_id: Uuid,
        channel_id: Uuid,
    ) -> Result<Option<ChannelMember>, sqlx::Error> {
        {
            if let Some(manager) = crate::events::context::store().get_manager(&space_id) {
                match manager.get_member(channel_id, user_id).await {
                    Ok(Ok(Some(member))) => return Ok(Some(member.channel)),
                    Ok(Ok(None)) | Ok(Err(_)) => {
                        manager.refresh_members_if_needed(channel_id).await.ok();
                    }
                    Err(_) => {}
                }
            }
        }

        if let Ok(Some(member)) = Member::get_by_channel(&mut *db, space_id, channel_id)
            .await
            .map(|members| {
                members
                    .into_iter()
                    .map(|member| member.channel)
                    .find(|member| member.user_id == user_id)
            })
        {
            return Ok(Some(member));
        }
        let record = sqlx::query_file!(
            "sql/channels/get_with_space_member.sql",
            user_id,
            channel_id
        )
        .fetch_optional(db)
        .await?;
        if let Some(record) = record {
            tracing::warn!(
                "Loaded channel member from DB for user {} in channel {}",
                user_id,
                channel_id
            );
            return Ok(Some(record.channel));
        }
        Ok(None)
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
        let span = tracing::info_span!("remove_user_from_channel", %user_id, %channel_id);
        tokio::spawn(
            async move {
                CACHE.invalidate(CacheType::ChannelMembers, user_id).await;
                if let Some(manager) = crate::events::context::store().get_manager(&space_id) {
                    manager
                        .remove_member_from_channel(channel_id, user_id)
                        .await
                        .ok();
                }
            }
            .instrument(span),
        );
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

        let span = tracing::info_span!("remove_user_by_space", %user_id, %space_id);
        tokio::spawn(
            async move {
                CACHE.invalidate(CacheType::ChannelMembers, user_id).await;
                if let Some(manager) = crate::events::context::store().get_manager(&space_id) {
                    manager.remove_member(&user_id).await.ok();
                }
            }
            .instrument(span),
        );
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
            let span = tracing::info_span!("set_master", %user_id, %channel_id);
            tokio::spawn(
                async move {
                    if let Some(manager) = crate::events::context::store().get_manager(&space_id) {
                        manager.update_channel_member(channel_member).await.ok();
                    }
                }
                .instrument(span),
            );
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
            let span = tracing::info_span!("set_master", %user_id, %channel_id);
            tokio::spawn(
                async move {
                    if let Some(manager) = crate::events::context::store().get_manager(&space_id) {
                        manager.update_channel_member(channel_member).await.ok();
                    }
                }
                .instrument(span),
            );
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
            let manager = store.get_manager(&space_id);
            if let Some(manager) = manager {
                if let Ok(Ok(members)) = manager.get_members_in_channel(channel_id).await {
                    if !members.is_empty() {
                        return Ok(members);
                    }
                }
            }
        }
        Member::get_by_channel_from_db(db, space_id, channel_id).await
    }

    pub fn load_to_cache(space_id: Uuid, channel_id: Uuid) {
        let span = tracing::info_span!("load_to_cache", %space_id, %channel_id);
        tokio::spawn(
            async move {
                let db = db::get().await;
                let _ = Member::get_by_channel_from_db(&db, space_id, channel_id).await;
            }
            .instrument(span),
        );
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
            crate::events::context::store()
                .get_or_create_manager(space_id)
                .set_members(channel_id, members.clone())
                .await
                .ok();
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cache::{CACHE, CacheType};
    use crate::spaces::{Space, SpaceMember};
    use crate::users::User;
    use uuid::Uuid;

    fn unique_name(prefix: &str) -> String {
        let raw = Uuid::new_v4().simple().to_string();
        format!("{prefix}_{}", &raw[..6])
    }

    async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> User {
        let raw = Uuid::new_v4().simple().to_string();
        let username = format!("{prefix}_usr_{}", &raw[..6]);
        let email = format!("{prefix}_{raw}@example.com");
        User::register(pool, &email, &username, "Channel Tester", "ChannelPass123!")
            .await
            .expect("failed to create test user")
    }

    async fn create_test_space(pool: &sqlx::PgPool, owner: &User, prefix: &str) -> Space {
        let name = unique_name(prefix);
        let description = format!("Description for {name}");
        let space = Space::create(pool, name, &owner.id, description, None, Some("d20"))
            .await
            .expect("failed to create space");
        SpaceMember::add_admin(pool, &owner.id, &space.id)
            .await
            .expect("failed to add owner as admin");
        space
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_channel_create_and_query_flow(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let space = create_test_space(&pool, &owner, "channel_space").await;

        let channel = Channel::create(
            &pool,
            &space.id,
            "General Chat",
            true,
            Some("d12"),
            ChannelType::InGame,
        )
        .await
        .expect("failed to create channel");

        assert_eq!(channel.space_id, space.id);
        assert_eq!(channel.default_dice_type, "d12");
        assert!(channel.is_public);
        assert_eq!(channel.r#type, ChannelType::InGame);
        assert!(!channel.is_archived);

        let fetched = Channel::get_by_id(&pool, &channel.id)
            .await
            .expect("get_by_id failed")
            .expect("channel not found by id");
        assert_eq!(fetched.id, channel.id);

        let fetched_by_name = Channel::get_by_name(&pool, space.id, &channel.name)
            .await
            .expect("get_by_name failed")
            .expect("channel not found by name");
        assert_eq!(fetched_by_name.id, channel.id);

        let map = Channel::get_by_id_list(&pool, std::iter::once(channel.id))
            .await
            .expect("get_by_id_list failed");
        assert_eq!(map.len(), 1);
        assert!(map.get(&channel.id).is_some());

        let with_space = Channel::get_with_space(&pool, &channel.id)
            .await
            .expect("get_with_space failed")
            .expect("channel with space not found");
        assert_eq!(with_space.0.id, channel.id);
        assert_eq!(with_space.1.id, space.id);

        let channels_in_space = Channel::get_by_space(&pool, &space.id)
            .await
            .expect("get_by_space failed");
        assert!(channels_in_space.iter().any(|item| item.id == channel.id));

        let owner_member =
            ChannelMember::add_user(&pool, owner.id, channel.id, space.id, "GM", true)
                .await
                .expect("failed to add owner to channel");
        assert!(owner_member.is_master);

        let channels_for_owner = Channel::get_by_space_and_user(&pool, &space.id, &owner.id)
            .await
            .expect("get_by_space_and_user failed");
        assert!(
            channels_for_owner
                .iter()
                .any(|entry| entry.channel.id == channel.id
                    && entry.member.as_ref().map(|m| m.user_id) == Some(owner.id))
        );

        let mut conn = pool.acquire().await.expect("failed to acquire connection");
        let channels_with_member = Channel::get_by_user(&mut conn, owner.id)
            .await
            .expect("get_by_user failed");
        assert!(
            channels_with_member
                .iter()
                .any(|entry| entry.channel.id == channel.id && entry.member.user_id == owner.id)
        );
        drop(conn);

        let edited = Channel::edit(
            &pool,
            &channel.id,
            Some("Renamed Channel"),
            Some("Discuss strategies"),
            Some("d6"),
            Some("/roll 2d6"),
            Some(false),
            Some(true),
            Some(ChannelType::Document),
            Some(true),
        )
        .await
        .expect("failed to edit channel");

        assert_eq!(edited.name, "Renamed Channel");
        assert_eq!(edited.topic, "Discuss strategies");
        assert_eq!(edited.default_dice_type, "d6");
        assert_eq!(edited.default_roll_command, "/roll 2d6");
        assert!(!edited.is_public);
        assert!(edited.is_document);
        assert_eq!(edited.r#type, ChannelType::Document);
        assert!(edited.is_archived);

        let mut conn = pool.acquire().await.expect("failed to acquire connection");
        let deleted = Channel::delete(&mut *conn, &channel.id, &space.id)
            .await
            .expect("delete failed");
        assert_eq!(deleted, 1);
        drop(conn);

        let after_delete = Channel::get_by_id(&pool, &channel.id)
            .await
            .expect("get after delete failed");
        assert!(after_delete.is_none());
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_channel_member_flow(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let member = create_test_user(&pool, "member").await;
        let space = create_test_space(&pool, &owner, "channel_member").await;
        SpaceMember::add_user(&pool, &member.id, &space.id)
            .await
            .expect("failed to add member to space");

        let channel = Channel::create(
            &pool,
            &space.id,
            "Adventures",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to create member test channel");

        let owner_member =
            ChannelMember::add_user(&pool, owner.id, channel.id, space.id, "GM", true)
                .await
                .expect("failed to add owner to channel");
        assert!(owner_member.is_master);

        let member_record =
            ChannelMember::add_user(&pool, member.id, channel.id, space.id, "Player", false)
                .await
                .expect("failed to add member to channel");
        assert!(!member_record.is_master);

        let members_with_user = ChannelMember::get_by_channel(&pool, &channel.id, false)
            .await
            .expect("get_by_channel failed");
        assert_eq!(members_with_user.len(), 2);

        let owner_channels = ChannelMember::get_by_user(&pool, owner.id)
            .await
            .expect("get_by_user failed for owner");
        assert_eq!(owner_channels.len(), 1);

        let color_list_before = ChannelMember::get_color_list(&pool, &channel.id)
            .await
            .expect("get_color_list failed before edit");
        assert!(color_list_before.is_empty());

        let updated_member = ChannelMember::edit(
            &pool,
            member.id,
            channel.id,
            space.id,
            Some("Player One"),
            Some("#112233"),
        )
        .await
        .expect("failed to edit member")
        .expect("member should exist after edit");
        assert_eq!(updated_member.character_name, "Player One");
        assert_eq!(updated_member.text_color.as_deref(), Some("#112233"));

        let color_list_after = ChannelMember::get_color_list(&pool, &channel.id)
            .await
            .expect("get_color_list failed after edit");
        assert_eq!(
            color_list_after.get(&member.id).map(String::as_str),
            Some("#112233")
        );

        let promoted = ChannelMember::set_master(&pool, &member.id, &channel.id, space.id, true)
            .await
            .expect("set_master failed")
            .expect("expected updated member");
        assert!(promoted.is_master);

        let is_master_flag = ChannelMember::is_master(&pool, member.id, channel.id, space.id)
            .await
            .expect("is_master failed");
        assert!(is_master_flag);

        let with_space_member =
            ChannelMember::get_with_space_member(&pool, member.id, channel.id, &space.id)
                .await
                .expect("get_with_space_member failed")
                .expect("expected channel member with space");
        assert_eq!(with_space_member.0.user_id, member.id);
        assert_eq!(with_space_member.1.user_id, member.id);
        assert_eq!(with_space_member.1.space_id, space.id);
        let mut conn = pool.acquire().await.expect("acquire conn failed");
        let fetched_member = ChannelMember::get(&mut *conn, member.id, space.id, channel.id)
            .await
            .expect("get member failed")
            .expect("member should exist");
        assert_eq!(fetched_member.user_id, member.id);

        let members_state = Member::get_by_channel_from_db(&mut *conn, space.id, channel.id)
            .await
            .expect("get_by_channel_from_db failed");
        assert_eq!(members_state.len(), 2);

        let attached = members_attach_user(&mut *conn, members_state.clone())
            .await
            .expect("members_attach_user failed");
        assert_eq!(attached.len(), 2);
        assert!(attached.iter().any(|item| item.user.id == member.id));

        ChannelMember::remove_user(&mut *conn, member.id, channel.id, space.id)
            .await
            .expect("remove_user failed");

        let member_channels_after_remove = ChannelMember::get_by_user(&mut *conn, member.id)
            .await
            .expect("get_by_user failed after remove");
        assert!(member_channels_after_remove.is_empty());

        let remaining_members = ChannelMember::get_by_channel(&mut *conn, &channel.id, false)
            .await
            .expect("get_by_channel failed after remove");
        assert_eq!(remaining_members.len(), 1);
        assert_eq!(remaining_members[0].member.user_id, owner.id);

        let removed_channels = ChannelMember::remove_user_by_space(&mut *conn, owner.id, space.id)
            .await
            .expect("remove_user_by_space failed");
        assert_eq!(removed_channels, vec![channel.id]);

        CACHE.invalidate(CacheType::ChannelMembers, owner.id).await;
        let owner_channels_after = ChannelMember::get_by_user(&mut *conn, owner.id)
            .await
            .expect("owner channels after space removal failed");
        assert!(owner_channels_after.is_empty());
    }
}
