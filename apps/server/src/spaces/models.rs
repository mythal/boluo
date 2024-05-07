use std::collections::HashMap;
use std::convert::TryInto;

use chrono::prelude::*;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use sqlx::query_file_scalar;
use ts_rs::TS;
use uuid::Uuid;

use crate::cache::make_key;
use crate::channels::ChannelMember;
use crate::error::{AppError, ModelError};
use crate::spaces::api::SpaceWithMember;
use crate::users::User;
use crate::utils::merge_blank;

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, TS)]
#[ts(export)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StatusKind {
    Offline,
    Away,
    Online,
}

#[derive(Serialize, Deserialize, Debug, Clone, TS)]
#[ts(export)]
pub struct UserStatus {
    #[ts(type = "number")]
    pub timestamp: i64,
    pub kind: StatusKind,
    pub focus: Vec<Uuid>,
}

pub async fn space_users_status(
    cache: &mut crate::cache::Connection,
    space_id: Uuid,
) -> Result<HashMap<Uuid, UserStatus>, AppError> {
    let redis = &mut cache.inner;
    let key = make_key(b"space", &space_id, b"heartbeat");
    let redis_result: HashMap<Vec<u8>, Vec<u8>> = redis.hgetall(&*key).await?;
    let mut table: HashMap<Uuid, UserStatus> = HashMap::new();
    for (user_id_bytes, data) in redis_result.into_iter() {
        let user_id_array: [u8; 16] = match user_id_bytes.try_into() {
            Ok(array) => array,
            Err(bytes) => {
                log::error!("Failed to convert user id in cache to [u8; 16]: {:?}", bytes);
                continue;
            }
        };
        match serde_json::from_slice::<UserStatus>(&data) {
            Ok(status) => {
                table.insert(Uuid::from_bytes(user_id_array), status);
            }
            Err(err) => log::error!("failed to deserialize user status in cache: {}", err),
        }
    }
    Ok(table)
}

#[derive(Debug, Serialize, Deserialize, Clone, TS, sqlx::Type)]
#[sqlx(type_name = "spaces")]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Space {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    #[ts(type = "number")]
    pub created: DateTime<Utc>,
    #[ts(type = "number")]
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
        query_file_scalar!(
            "sql/spaces/create.sql",
            name,
            owner_id,
            password,
            default_dice_type,
            description
        )
        .fetch_one(db)
        .await
        .map_err(Into::into)
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

    pub async fn delete<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<(), sqlx::Error> {
        sqlx::query_file!("sql/spaces/delete.sql", id).execute(db).await?;
        Ok(())
    }

    pub async fn all<'c, T: sqlx::PgExecutor<'c>>(db: T) -> Result<Vec<Space>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/all.sql").fetch_all(db).await
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<Option<Space>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/get_by_id.sql", id)
            .fetch_optional(db)
            .await
    }

    pub async fn get_by_channel<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
    ) -> Result<Option<Space>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/get_by_channel.sql", channel_id)
            .fetch_optional(db)
            .await
    }

    pub async fn refresh_token<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<Uuid, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/refresh_token.sql", id)
            .fetch_one(db)
            .await
    }

    pub async fn get_token<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<Uuid, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/get_token.sql", id)
            .fetch_one(db)
            .await
    }

    pub async fn is_public<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<Option<bool>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/is_public.sql", id)
            .fetch_optional(db)
            .await
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
        sqlx::query_file_scalar!(
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
        .await
        .map_err(Into::into)
    }

    pub async fn search<'c, T: sqlx::PgExecutor<'c>>(db: T, search: String) -> Result<Vec<Space>, sqlx::Error> {
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

    pub async fn get_by_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
    ) -> Result<Vec<SpaceWithMember>, sqlx::Error> {
        sqlx::query_file_as!(SpaceWithMember, "sql/spaces/get_spaces_by_user.sql", user_id)
            .fetch_all(db)
            .await
    }

    pub async fn user_owned<'c, T: sqlx::PgExecutor<'c>>(db: T, user_id: &Uuid) -> Result<Vec<Space>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/user_owned_spaces.sql", user_id)
            .fetch_all(db)
            .await
    }

    pub async fn get_settings<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
    ) -> Result<serde_json::Value, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/get_settings.sql", space_id)
            .fetch_optional(db)
            .await
            .map(|record| record.unwrap_or(serde_json::json!({})))
    }
    pub async fn put_settings<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        settings: &serde_json::Value,
    ) -> Result<(), sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/put_settings.sql", space_id, settings)
            .execute(db)
            .await?;
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, TS, sqlx::Type)]
#[sqlx(type_name = "space_members")]
#[ts(export)]
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
        SpaceMember::set(db, user_id, space_id, Some(is_admin)).await
    }

    async fn set<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        space_id: &Uuid,
        is_admin: Option<bool>,
    ) -> Result<Option<SpaceMember>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/spaces/set_space_member.sql", is_admin, user_id, space_id,)
            .fetch_optional(db)
            .await
    }

    pub async fn remove_user(
        db: &mut sqlx::PgConnection,
        user_id: &Uuid,
        space_id: &Uuid,
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
        ChannelMember::remove_user_by_space(&mut *db, user_id, space_id).await
    }

    pub async fn add_admin<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        space_id: &Uuid,
    ) -> Result<SpaceMember, sqlx::Error> {
        sqlx::query_file_as!(
            AddUserToSpace,
            "sql/spaces/add_user_to_space.sql",
            user_id,
            space_id,
            true
        )
        .fetch_one(db)
        .await
        .map(|result| result.member)
    }

    pub async fn add_user<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        space_id: &Uuid,
    ) -> Result<SpaceMember, sqlx::Error> {
        sqlx::query_file_as!(
            AddUserToSpace,
            "sql/spaces/add_user_to_space.sql",
            user_id,
            space_id,
            false
        )
        .fetch_one(db)
        .await
        .map(|result| result.member)
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

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
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
        let members = sqlx::query_file_as!(SpaceMemberWithUser, "sql/spaces/get_members_by_spaces.sql", space_id)
            .fetch_all(db)
            .await?;
        Ok(members.into_iter().map(|member| (member.user.id, member)).collect())
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
