use std::collections::HashMap;

use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use sqlx::query_file_scalar;
use uuid::Uuid;

use crate::cache::{CACHE, CacheType};
use crate::channels::ChannelMember;
use crate::error::ModelError;
use crate::spaces::api::SpaceWithMember;
use crate::ttl::{self, Lifespan, Mortal, fetch_entry, fetch_entry_optional};
use crate::users::User;
use crate::utils::merge_blank;

#[derive(Debug, Clone)]
pub struct UserSpaces {
    pub space_members: Vec<SpaceMember>,
}

impl Lifespan for UserSpaces {
    fn ttl_sec() -> u64 {
        ttl::minute::TWO
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, sqlx::Type)]
#[sqlx(type_name = "spaces")]
#[serde(rename_all = "camelCase")]
pub struct Space {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
    pub owner_id: Uuid,
    pub is_public: bool,
    #[serde(skip)]
    pub deleted: bool,
    #[serde(skip)]
    pub password: String,
    pub language: String,
    pub default_dice_type: String,
    pub explorable: bool,
    #[serde(skip)]
    pub invite_token: Uuid,
    pub allow_spectator: bool,
    pub latest_activity: DateTime<Utc>,
}

impl Lifespan for Space {
    fn ttl_sec() -> u64 {
        ttl::day::HALF
    }
}

impl Space {
    pub async fn create<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        name: String,
        owner_id: &Uuid,
        description: String,
        password: Option<String>,
        default_dice_type: Option<&str>,
    ) -> Result<Space, ModelError> {
        use crate::validators::{DESCRIPTION, DICE, DISPLAY_NAME};
        let name = merge_blank(&name);
        DISPLAY_NAME.run(&name)?;
        if let Some(default_dice_type) = default_dice_type {
            DICE.run(default_dice_type)?;
        }
        DESCRIPTION.run(description.as_str())?;
        let space = query_file_scalar!(
            "sql/spaces/create.sql",
            name,
            owner_id,
            password,
            default_dice_type,
            description
        )
        .fetch_one(db)
        .await?;
        CACHE.Space.insert(space.id, space.clone().into());
        Ok(space)
    }

    pub async fn is_admin<'c, T: sqlx::PgExecutor<'c>>(&self, db: T, user_id: &Uuid) -> bool {
        if self.owner_id == *user_id {
            return true;
        }
        let Ok(space_member) = SpaceMember::get(db, user_id, &self.id).await else {
            return false;
        };
        space_member.map(|member| member.is_admin).unwrap_or(false)
    }

    pub async fn delete(db: &mut sqlx::PgConnection, id: Uuid) -> Result<(), sqlx::Error> {
        let space_members = SpaceMemberWithUser::get_by_space(&mut *db, &id).await?;
        sqlx::query_file!("sql/spaces/delete.sql", &id)
            .execute(db)
            .await?;
        let mut invalidate_tasks = vec![
            CACHE.invalidate(CacheType::Space, id),
            CACHE.invalidate(CacheType::SpaceSettings, id),
        ];

        for (_, space_member_with_user) in space_members {
            invalidate_tasks
                .push(CACHE.invalidate(CacheType::UserSpaces, space_member_with_user.user.id));
        }

        futures::future::join_all(invalidate_tasks).await;
        Ok(())
    }

    pub async fn recent<'c, T: sqlx::PgExecutor<'c>>(db: T) -> Result<Vec<Uuid>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/recent.sql")
            .fetch_all(db)
            .await
    }

    pub async fn all<'c, T: sqlx::PgExecutor<'c>>(db: T) -> Result<Vec<Space>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/all.sql")
            .fetch_all(db)
            .await
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Option<Space>, sqlx::Error> {
        let id = *id;
        fetch_entry_optional(&CACHE.Space, id, async move {
            sqlx::query_file_scalar!("sql/spaces/get_by_id.sql", id)
                .fetch_one(db)
                .await
        })
        .await
    }

    pub async fn get_by_id_list<'c, T: sqlx::PgExecutor<'c>, I: Iterator<Item = Uuid>>(
        db: T,
        id_list: I,
    ) -> Result<HashMap<Uuid, Space>, sqlx::Error> {
        let mut query_ids: Vec<Uuid> = Vec::new();
        let mut result_map: HashMap<Uuid, Space> = HashMap::new();
        for id in id_list {
            if let Some(space_item) = CACHE.Space.get(&id).and_then(Mortal::fresh_only) {
                result_map.insert(space_item.id, space_item);
            } else {
                query_ids.push(id);
            }
        }
        let spaces = sqlx::query_file_scalar!("sql/spaces/get_by_id_list.sql", &*query_ids)
            .fetch_all(db)
            .await?;
        for space in spaces {
            CACHE.Space.insert(space.id, space.clone().into());
            result_map.insert(space.id, space);
        }
        Ok(result_map)
    }

    pub async fn get_by_channel<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
    ) -> Result<Option<Space>, sqlx::Error> {
        if let Some(channel) = CACHE.Channel.get(channel_id).and_then(Mortal::fresh_only) {
            if let Some(space) = CACHE
                .Space
                .get(&channel.space_id)
                .and_then(Mortal::fresh_only)
            {
                return Ok(Some(space));
            }
        }
        let space = sqlx::query_file_scalar!("sql/spaces/get_by_channel.sql", channel_id)
            .fetch_optional(db)
            .await?;
        if let Some(space) = &space {
            CACHE.Space.insert(space.id, space.clone().into());
        }
        Ok(space)
    }

    pub async fn refresh_token<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Uuid, sqlx::Error> {
        let token = sqlx::query_file_scalar!("sql/spaces/refresh_token.sql", id)
            .fetch_one(db)
            .await?;
        CACHE.invalidate(CacheType::Space, *id).await;
        Ok(token)
    }

    pub async fn get_token<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Uuid, sqlx::Error> {
        Space::get_by_id(db, id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)
            .map(|space| space.invite_token)
    }

    pub async fn is_public<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Option<bool>, sqlx::Error> {
        Space::get_by_id(db, id)
            .await
            .map(|space| space.map(|space| space.is_public))
    }

    pub async fn edit<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        name: Option<String>,
        description: Option<String>,
        default_dice_type: Option<String>,
        explorable: Option<bool>,
        is_public: Option<bool>,
        allow_spectator: Option<bool>,
    ) -> Result<Option<Space>, ModelError> {
        use crate::validators;
        let name = name.as_ref().map(|s| s.trim());
        let description = description.as_ref().map(|s| s.trim());
        if let Some(name) = name {
            validators::DISPLAY_NAME.run(name)?;
        }
        if let Some(description) = description {
            validators::DESCRIPTION.run(description)?;
        }
        if let Some(dice) = default_dice_type.as_ref() {
            validators::DICE.run(dice)?;
        }
        let space = sqlx::query_file_scalar!(
            "sql/spaces/edit.sql",
            space_id,
            name,
            description,
            default_dice_type,
            explorable,
            is_public,
            allow_spectator
        )
        .fetch_optional(db)
        .await?;
        if let Some(space) = &space {
            CACHE.Space.insert(space.id, space.clone().into());
        }
        Ok(space)
    }

    pub async fn search<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        search: String,
    ) -> Result<Vec<Space>, sqlx::Error> {
        // https://www.postgresql.org/docs/9.3/functions-matching.html
        let patterns: Vec<String> = search
            .trim()
            .split(|c: char| c.is_whitespace() || c.is_ascii_punctuation())
            .map(|s| {
                let mut pattern = String::from("%");
                pattern.push_str(s);
                pattern.push('%');
                pattern
            })
            .collect();
        query_file_scalar!("sql/spaces/search.sql", &patterns)
            .fetch_all(db)
            .await
    }

    pub async fn get_by_user(
        db: &mut sqlx::PgConnection,
        user_id: Uuid,
    ) -> Result<Vec<SpaceWithMember>, sqlx::Error> {
        let space_members = SpaceMember::get_by_user(&mut *db, user_id).await?;
        let spaces =
            Space::get_by_id_list(&mut *db, space_members.iter().map(|member| member.space_id))
                .await?;
        let Some(user) = User::get_by_id(db, &user_id).await? else {
            return Ok(vec![]);
        };
        let mut spaces_with_member: Vec<SpaceWithMember> = vec![];
        for member in space_members {
            let Some(space) = spaces.get(&member.space_id) else {
                continue;
            };
            spaces_with_member.push(SpaceWithMember {
                space: space.clone(),
                member,
                user: user.clone(),
            });
        }
        Ok(spaces_with_member)
    }

    pub async fn user_owned<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
    ) -> Result<Vec<Space>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/user_owned_spaces.sql", user_id)
            .fetch_all(db)
            .await
    }

    pub async fn get_settings<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
    ) -> Result<serde_json::Value, sqlx::Error> {
        use serde_json::json;
        fetch_entry(&CACHE.SpaceSettings, space_id, async move {
            sqlx::query_file_scalar!("sql/spaces/get_settings.sql", space_id)
                .fetch_optional(db)
                .await
                .map(|settings| settings.unwrap_or(json!({})))
                .map(SpaceSettings)
        })
        .await
        .map(|settings| settings.0)
    }
    pub async fn put_settings<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        settings: &serde_json::Value,
    ) -> Result<(), sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/put_settings.sql", space_id, settings)
            .execute(db)
            .await?;
        CACHE
            .SpaceSettings
            .insert(space_id, settings.clone().into());
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, sqlx::Type)]
#[sqlx(type_name = "space_members")]
#[serde(rename_all = "camelCase")]
pub struct SpaceMember {
    pub user_id: Uuid,
    pub space_id: Uuid,
    pub is_admin: bool,
    pub join_date: DateTime<Utc>,
}

struct AddUserToSpace {
    created: bool,
    member: SpaceMember,
}

impl SpaceMember {
    pub async fn set_admin<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        space_id: &Uuid,
        is_admin: bool,
    ) -> Result<Option<SpaceMember>, sqlx::Error> {
        let result = SpaceMember::set(db, user_id, space_id, Some(is_admin)).await?;
        CACHE.invalidate(CacheType::UserSpaces, *user_id).await;
        Ok(result)
    }

    pub async fn get_by_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
    ) -> Result<Vec<SpaceMember>, sqlx::Error> {
        let user_spaces = fetch_entry(&CACHE.UserSpaces, user_id, async move {
            sqlx::query_file_scalar!("sql/spaces/get_space_member_list_by_user.sql", user_id)
                .fetch_all(db)
                .await
                .map(|space_members| UserSpaces { space_members })
        })
        .await?;
        Ok(user_spaces.space_members)
    }

    async fn set<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        space_id: &Uuid,
        is_admin: Option<bool>,
    ) -> Result<Option<SpaceMember>, sqlx::Error> {
        let result = sqlx::query_file_scalar!(
            "sql/spaces/set_space_member.sql",
            is_admin,
            user_id,
            space_id,
        )
        .fetch_optional(db)
        .await?;
        CACHE.invalidate(CacheType::UserSpaces, *user_id).await;
        Ok(result)
    }

    pub async fn remove_user(
        db: &mut sqlx::PgConnection,
        user_id: Uuid,
        space_id: Uuid,
    ) -> Result<Vec<Uuid>, sqlx::Error> {
        let affected = {
            sqlx::query_file_scalar!("sql/spaces/remove_user_from_space.sql", user_id, space_id)
                .execute(&mut *db)
                .await?
                .rows_affected()
        };
        if (affected as usize) == 0 {
            return Ok(vec![]);
        }
        CACHE.invalidate(CacheType::UserSpaces, user_id).await;
        ChannelMember::remove_user_by_space(&mut *db, user_id, space_id).await
    }

    pub async fn add_admin<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        space_id: &Uuid,
    ) -> Result<SpaceMember, sqlx::Error> {
        let result = sqlx::query_file_as!(
            AddUserToSpace,
            "sql/spaces/add_user_to_space.sql",
            user_id,
            space_id,
            true
        )
        .fetch_one(db)
        .await?;
        CACHE.invalidate(CacheType::UserSpaces, *user_id).await;
        Ok(result.member)
    }

    pub async fn add_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        space_id: &Uuid,
    ) -> Result<SpaceMember, sqlx::Error> {
        let result = sqlx::query_file_as!(
            AddUserToSpace,
            "sql/spaces/add_user_to_space.sql",
            user_id,
            space_id,
            false
        )
        .fetch_one(db)
        .await?;
        CACHE.invalidate(CacheType::UserSpaces, *user_id).await;
        Ok(result.member)
    }

    pub async fn get<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        space_id: &Uuid,
    ) -> Result<Option<SpaceMember>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/get_space_member.sql", user_id, space_id)
            .fetch_optional(db)
            .await
    }

    pub async fn get_by_channel<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        channel_id: &Uuid,
    ) -> Result<Option<SpaceMember>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/get_members_by_channel.sql", user_id, channel_id)
            .fetch_optional(db)
            .await
    }
}

#[derive(Debug, Serialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SpaceMemberWithUser {
    pub space: SpaceMember,
    pub user: User,
}

impl SpaceMemberWithUser {
    pub async fn get_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
    ) -> Result<HashMap<Uuid, SpaceMemberWithUser>, sqlx::Error> {
        let members = sqlx::query_file_as!(
            SpaceMemberWithUser,
            "sql/spaces/get_members_by_spaces.sql",
            space_id
        )
        .fetch_all(db)
        .await?;
        Ok(members
            .into_iter()
            .map(|member| (member.user.id, member))
            .collect())
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct SpaceSettings(pub serde_json::Value);

impl Lifespan for SpaceSettings {
    fn ttl_sec() -> u64 {
        ttl::day::HALF
    }
}

impl From<serde_json::Value> for SpaceSettings {
    fn from(settings: serde_json::Value) -> Self {
        Self(settings)
    }
}

impl From<serde_json::Value> for Mortal<SpaceSettings> {
    fn from(settings: serde_json::Value) -> Self {
        Mortal::new(SpaceSettings(settings))
    }
}

// #[derive(Debug, Serialize, Deserialize, sqlx::Type)]
// #[sqlx(type_name = "restrained_members")]
// #[serde(rename_all = "camelCase")]
// pub struct RestrainedMember {
//     pub user_id: Uuid,
//     pub space_id: Uuid,
//     pub blocked: bool,
//     pub muted: bool,
//     pub restrained_date: DateTime<Utc>,
//     pub operator_id: Option<Uuid>,
// }

// impl RestrainedMember {}
