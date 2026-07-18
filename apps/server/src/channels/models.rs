use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::channels::api::{ChannelMemberWithUser, ChannelWithMaybeMember, ChannelWithMember};
use crate::error::ModelError;
use crate::spaces::{Space, SpaceMember};
use crate::users::User;
use crate::utils::{is_false, merge_blank};
use quick_cache::sync::Cache;
use std::collections::HashMap;
use std::sync::LazyLock;

const CHANNEL_SPACE_ID_CACHE_CAPACITY: usize = 1024 * 8;

/// Immutable channel ownership. A soft-deleted channel still belongs to its original Space.
static CHANNEL_SPACE_ID_CACHE: LazyLock<Cache<Uuid, Uuid>> =
    LazyLock::new(|| Cache::new(CHANNEL_SPACE_ID_CACHE_CAPACITY));

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

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Option<Channel>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/fetch_channel.sql", id)
            .fetch_optional(db)
            .await
    }

    /// Returns the immutable owning Space, including for a soft-deleted channel.
    ///
    /// This does not prove that the channel is still active. Callers that perform
    /// business operations must validate the Channel inside their transaction.
    pub async fn resolve_owning_space_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Option<Uuid>, sqlx::Error> {
        if let Some(space_id) = CHANNEL_SPACE_ID_CACHE.get(id) {
            return Ok(Some(space_id));
        }
        let space_id = sqlx::query_file_scalar!("sql/channels/get_owning_space_id.sql", id)
            .fetch_optional(db)
            .await?;
        if let Some(space_id) = space_id {
            CHANNEL_SPACE_ID_CACHE.insert(*id, space_id);
        }
        Ok(space_id)
    }

    pub async fn get_by_id_list<'c, T: sqlx::PgExecutor<'c>, I: Iterator<Item = Uuid>>(
        db: T,
        id_list: I,
    ) -> Result<HashMap<Uuid, Channel>, sqlx::Error> {
        let query_ids: Vec<Uuid> = id_list.collect();
        let channels = sqlx::query_file_scalar!("sql/channels/get_by_id_list.sql", &*query_ids)
            .fetch_all(db)
            .await?;
        Ok(channels
            .into_iter()
            .map(|channel| (channel.id, channel))
            .collect())
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
        let channel_and_space = sqlx::query_file!("sql/channels/fetch_channel_with_space.sql", id)
            .fetch_optional(db)
            .await?
            .map(|record| (record.channel, record.space));
        Ok(channel_and_space)
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
        let channel_list = sqlx::query_file_as!(
            ChannelWithMaybeMember,
            "sql/channels/get_by_space_and_user.sql",
            space_id,
            user_id
        )
        .fetch_all(db)
        .await?;
        Ok(channel_list)
    }

    pub async fn delete(db: &mut sqlx::PgConnection, id: &Uuid) -> Result<bool, sqlx::Error> {
        let affected = sqlx::query_file_scalar!("sql/channels/delete_channel.sql", id)
            .execute(&mut *db)
            .await
            .map(|r| r.rows_affected())?;
        Ok(affected > 0)
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

impl ChannelMember {
    pub async fn add_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        channel_id: Uuid,
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
            &channel_id,
            character_name,
            is_master
        )
        .fetch_one(db)
        .await
        .map(|record| record.member)
        .map_err(Into::into)
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
        sqlx::query_file_scalar!("sql/channels/get_channel_member_list_by_user.sql", user_id)
            .fetch_all(db)
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
        user_id: Uuid,
        channel_id: Uuid,
        _space_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        sqlx::query_file_scalar!("sql/channels/is_master.sql", user_id, channel_id)
            .fetch_one(db)
            .await
    }

    pub async fn get_with_space_member<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        channel_id: Uuid,
        _space_id: &Uuid,
    ) -> Result<Option<(ChannelMember, SpaceMember)>, sqlx::Error> {
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
        _space_id: Uuid,
        channel_id: Uuid,
    ) -> Result<Option<ChannelMember>, sqlx::Error> {
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
        Ok(ids)
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
        let channel_member = sqlx::query_file_scalar!(
            "sql/channels/edit_member.sql",
            user_id,
            channel_id,
            character_name,
            text_color
        )
        .fetch_optional(db)
        .await?;
        Ok(channel_member)
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
        let channel_member = sqlx::query_file_scalar!(
            "sql/channels/set_master.sql",
            user_id,
            channel_id,
            is_master
        )
        .fetch_optional(db)
        .await?;
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
        _space_id: Uuid,
        channel_id: Uuid,
    ) -> Result<Vec<Member>, sqlx::Error> {
        sqlx::query_file_as!(Member, "sql/channels/get_member_by_channel.sql", channel_id)
            .fetch_all(db)
            .await
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
    use crate::committed_changes::CommittedChanges;
    use crate::context::AppContext;
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
    async fn db_test_rolled_back_channel_member_changes_have_no_shared_state_side_effect(
        pool: sqlx::PgPool,
    ) {
        let owner = create_test_user(&pool, "master_tx_owner").await;
        let member = create_test_user(&pool, "master_tx_member").await;
        let space = create_test_space(&pool, &owner, "master_tx_space").await;
        SpaceMember::add_user(&pool, &member.id, &space.id)
            .await
            .expect("failed to add space member");
        let channel = Channel::create(
            &pool,
            &space.id,
            "Master Transaction",
            true,
            Some("d20"),
            ChannelType::InGame,
        )
        .await
        .expect("failed to create channel");
        ChannelMember::add_user(&pool, member.id, channel.id, "Player", false)
            .await
            .expect("failed to add channel member");

        let ctx = AppContext::new(pool.clone(), None);
        let member_before_transaction = ctx
            .space_store
            .resolve_channel_member(space.id, channel.id, member.id)
            .await
            .expect("failed to load runtime member")
            .expect("member is missing from runtime");
        assert!(!member_before_transaction.channel.is_master);

        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        ChannelMember::set_master(&mut *transaction, &member.id, &channel.id, true)
            .await
            .expect("failed to update master in transaction");
        ChannelMember::edit(
            &mut *transaction,
            member.id,
            channel.id,
            Some("Changed Before Rollback"),
            Some("#123456"),
        )
        .await
        .expect("failed to edit member in transaction");
        ChannelMember::remove_user(&mut *transaction, member.id, channel.id)
            .await
            .expect("failed to remove member in transaction");

        let member_before_rollback = ctx
            .space_store
            .resolve_channel_member(space.id, channel.id, member.id)
            .await
            .expect("failed to query runtime")
            .expect("member disappeared from runtime");
        assert!(
            !member_before_rollback.channel.is_master,
            "an uncommitted channel member change mutated runtime state"
        );
        assert_eq!(member_before_rollback.channel.character_name, "Player");

        transaction
            .rollback()
            .await
            .expect("failed to roll back transaction");

        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let removed = ChannelMember::remove_user_by_space(&mut *transaction, member.id, space.id)
            .await
            .expect("failed to remove space channel members in transaction");
        assert_eq!(removed, vec![channel.id]);
        let member_before_rollback = ctx
            .space_store
            .resolve_channel_member(space.id, channel.id, member.id)
            .await
            .expect("failed to query runtime");
        assert!(
            member_before_rollback.is_some(),
            "an uncommitted space-wide member removal mutated runtime state"
        );
        transaction
            .rollback()
            .await
            .expect("failed to roll back transaction");
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
        let fetched_space_id = Channel::resolve_owning_space_id(&pool, &channel.id)
            .await
            .expect("resolve_owning_space_id failed")
            .expect("channel Space ID not found");
        assert_eq!(fetched_space_id, space.id);

        let fetched_by_name = Channel::get_by_name(&pool, space.id, &channel.name)
            .await
            .expect("get_by_name failed")
            .expect("channel not found by name");
        assert_eq!(fetched_by_name.id, channel.id);

        let map = Channel::get_by_id_list(&pool, std::iter::once(channel.id))
            .await
            .expect("get_by_id_list failed");
        assert_eq!(map.len(), 1);
        assert!(map.contains_key(&channel.id));

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

        let owner_member = ChannelMember::add_user(&pool, owner.id, channel.id, "GM", true)
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
        assert!(
            Channel::delete(&mut conn, &channel.id)
                .await
                .expect("delete failed"),
            "channel should have been deleted"
        );
        drop(conn);
        let mut changes = CommittedChanges::default();
        changes.channel_deleted(space.id, channel.id);
        changes.apply().await;

        let after_delete = Channel::get_by_id(&pool, &channel.id)
            .await
            .expect("get after delete failed");
        assert!(after_delete.is_none());
        let space_id_after_delete = Channel::resolve_owning_space_id(&pool, &channel.id)
            .await
            .expect("resolve_owning_space_id after delete failed")
            .expect("deleted channel ownership was lost");
        assert_eq!(space_id_after_delete, space.id);
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

        let owner_member = ChannelMember::add_user(&pool, owner.id, channel.id, "GM", true)
            .await
            .expect("failed to add owner to channel");
        assert!(owner_member.is_master);

        let member_record = ChannelMember::add_user(&pool, member.id, channel.id, "Player", false)
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
        let ctx = AppContext::new(pool.clone(), None);
        ctx.space_store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");

        let color_list_before = ChannelMember::get_color_list(&pool, &channel.id)
            .await
            .expect("get_color_list failed before edit");
        assert!(color_list_before.is_empty());

        let updated_member = ChannelMember::edit(
            &pool,
            member.id,
            channel.id,
            Some("Player One"),
            Some("#112233"),
        )
        .await
        .expect("failed to edit member")
        .expect("member should exist after edit");
        let mut changes = CommittedChanges::default();
        changes.channel_member_changed(space.id, &updated_member);
        changes.apply_with_context(&ctx).await;
        assert_eq!(updated_member.character_name, "Player One");
        assert_eq!(updated_member.text_color.as_deref(), Some("#112233"));

        let color_list_after = ChannelMember::get_color_list(&pool, &channel.id)
            .await
            .expect("get_color_list failed after edit");
        assert_eq!(
            color_list_after.get(&member.id).map(String::as_str),
            Some("#112233")
        );

        let promoted = ChannelMember::set_master(&pool, &member.id, &channel.id, true)
            .await
            .expect("set_master failed")
            .expect("expected updated member");
        let mut changes = CommittedChanges::default();
        changes.channel_member_changed(space.id, &promoted);
        changes.apply_with_context(&ctx).await;
        assert!(promoted.is_master);
        let runtime_member = ctx
            .space_store
            .resolve_channel_member(space.id, channel.id, member.id)
            .await
            .expect("failed to query runtime")
            .expect("member was not applied to runtime");
        assert!(runtime_member.channel.is_master);

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
        let fetched_member = ChannelMember::get(&mut conn, member.id, space.id, channel.id)
            .await
            .expect("get member failed")
            .expect("member should exist");
        assert_eq!(fetched_member.user_id, member.id);

        let members_state = Member::get_by_channel(&mut *conn, space.id, channel.id)
            .await
            .expect("get_by_channel failed");
        assert_eq!(members_state.len(), 2);

        let attached = members_attach_user(&mut *conn, members_state.clone())
            .await
            .expect("members_attach_user failed");
        assert_eq!(attached.len(), 2);
        assert!(attached.iter().any(|item| item.user.id == member.id));

        ChannelMember::remove_user(&mut *conn, member.id, channel.id)
            .await
            .expect("remove_user failed");
        let mut changes = CommittedChanges::default();
        changes.channel_member_removed(space.id, channel.id, member.id);
        changes.apply_with_context(&ctx).await;
        let runtime_member = ctx
            .space_store
            .resolve_channel_member(space.id, channel.id, member.id)
            .await
            .expect("failed to query runtime");
        assert!(
            runtime_member.is_none(),
            "removed channel member remained in runtime"
        );

        let member_channels_after_remove = ChannelMember::get_by_user(&mut *conn, member.id)
            .await
            .expect("get_by_user failed after remove");
        assert!(member_channels_after_remove.is_empty());

        let remaining_members = ChannelMember::get_by_channel(&mut *conn, &channel.id, false)
            .await
            .expect("get_by_channel failed after remove");
        assert_eq!(remaining_members.len(), 1);
        assert_eq!(remaining_members[0].member.user_id, owner.id);

        let historical_members = ChannelMember::get_by_channel(&mut *conn, &channel.id, true)
            .await
            .expect("get_by_channel with history failed after remove");
        assert_eq!(historical_members.len(), 2);
        assert!(
            historical_members
                .iter()
                .any(|entry| entry.member.user_id == member.id && !entry.member.is_joined)
        );

        let removed_channels = ChannelMember::remove_user_by_space(&mut *conn, owner.id, space.id)
            .await
            .expect("remove_user_by_space failed");
        assert_eq!(removed_channels, vec![channel.id]);

        let owner_channels_after = ChannelMember::get_by_user(&mut *conn, owner.id)
            .await
            .expect("owner channels after space removal failed");
        assert!(owner_channels_after.is_empty());
    }
}
