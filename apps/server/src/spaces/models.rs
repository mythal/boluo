use std::collections::HashMap;
use std::convert::TryInto;

use chrono::prelude::*;
use postgres_types::FromSql;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

use crate::cache::make_key;
use crate::channels::ChannelMember;
use crate::database::Querist;
use crate::error::{AppError, DbError, ModelError};
use crate::spaces::api::SpaceWithMember;
use crate::users::User;
use crate::utils::{inner_result_map, merge_blank};

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

#[derive(Debug, Serialize, Deserialize, FromSql, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "spaces")]
pub struct Space {
    pub id: Uuid,
    pub owner_id: Uuid,
    #[serde(skip)]
    pub invite_token: Uuid,
    #[ts(type = "number")]
    pub created: DateTime<Utc>,
    #[ts(type = "number")]
    pub modified: DateTime<Utc>,
    pub name: String,
    pub description: String,
    #[serde(skip)]
    pub password: String,
    pub language: String,
    pub default_dice_type: String,
    pub is_public: bool,
    #[serde(skip)]
    pub deleted: bool,
    pub explorable: bool,
    pub allow_spectator: bool,
}

impl Space {
    pub async fn create<T: Querist>(
        db: &mut T,
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
        let row = db
            .query_exactly_one(
                include_str!("sql/create.sql"),
                &[&name, owner_id, &password, &default_dice_type, &description],
            )
            .await?;
        Ok(row.try_get(0)?)
    }

    pub async fn is_admin<T: Querist>(&self, db: &mut T, user_id: &Uuid) -> bool {
        if self.owner_id == *user_id {
            return true;
        }
        let Ok(space_member) = SpaceMember::get(db, user_id, &self.id).await else {
            return false;
        };
        space_member.map(|member| member.is_admin).unwrap_or(false)
    }

    pub async fn delete<T: Querist>(db: &mut T, id: &Uuid) -> Result<(), DbError> {
        db.execute(include_str!("sql/delete.sql"), &[id]).await.map(|_| ())
    }

    async fn get<T: Querist>(db: &mut T, id: Option<&Uuid>, name: Option<&str>) -> Result<Option<Space>, DbError> {
        use postgres_types::Type;
        let join_owner = false;
        let result = db
            .query_one_typed(
                include_str!("sql/get.sql"),
                &[Type::UUID, Type::TEXT, Type::BOOL],
                &[&id, &name, &join_owner],
            )
            .await;
        inner_result_map(result, |row| row.try_get(0))
    }

    pub async fn all<T: Querist>(db: &mut T) -> Result<Vec<Space>, DbError> {
        let rows = db.query(include_str!("sql/all.sql"), &[]).await?;
        Ok(rows.into_iter().map(|row| row.get(0)).collect())
    }

    pub async fn get_by_id<T: Querist>(db: &mut T, id: &Uuid) -> Result<Option<Space>, DbError> {
        Space::get(db, Some(id), None).await
    }

    pub async fn get_by_channel<T: Querist>(db: &mut T, channel_id: &Uuid) -> Result<Option<Space>, DbError> {
        db.query_one(include_str!("sql/get_by_channel.sql"), &[channel_id])
            .await
            .map(|row| row.map(|row| row.get(0)))
    }

    pub async fn refresh_token<T: Querist>(db: &mut T, id: &Uuid) -> Result<Uuid, DbError> {
        let row = db
            .query_exactly_one(include_str!("sql/refresh_token.sql"), &[id])
            .await?;
        row.try_get(0)
    }

    pub async fn get_token<T: Querist>(db: &mut T, id: &Uuid) -> Result<Uuid, DbError> {
        let row = db.query_exactly_one(include_str!("sql/get_token.sql"), &[id]).await?;
        row.try_get(0)
    }

    pub async fn is_public<T: Querist>(db: &mut T, id: &Uuid) -> Result<Option<bool>, DbError> {
        let row = db.query_one(include_str!("sql/is_public.sql"), &[id]).await?;
        Ok(row.map(|row| row.get(0)))
    }

    pub async fn edit<T: Querist>(
        db: &mut T,
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
        let result = db
            .query_one(
                include_str!("sql/edit.sql"),
                &[
                    &space_id,
                    &name,
                    &description,
                    &default_dice_type,
                    &explorable,
                    &is_public,
                    &allow_spectator,
                ],
            )
            .await?;
        Ok(result.map(|row| row.get(0)))
    }

    pub async fn search<T: Querist>(db: &mut T, search: String) -> Result<Vec<Space>, DbError> {
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
        let rows: Vec<Space> = db
            .query(include_str!("sql/search.sql"), &[&patterns])
            .await?
            .into_iter()
            .map(|row| row.get(0))
            .collect();
        Ok(rows)
    }

    pub async fn get_by_user<T: Querist>(db: &mut T, user_id: &Uuid) -> Result<Vec<SpaceWithMember>, DbError> {
        let rows = db.query(include_str!("sql/get_spaces_by_user.sql"), &[user_id]).await?;
        Ok(rows
            .into_iter()
            .map(|row| SpaceWithMember {
                space: row.get(0),
                member: row.get(1),
                user: row.get(2),
            })
            .collect())
    }

    pub async fn user_owned<T: Querist>(db: &mut T, user_id: &Uuid) -> Result<Vec<Space>, DbError> {
        let rows = db.query(include_str!("sql/user_owned_spaces.sql"), &[user_id]).await?;
        Ok(rows.into_iter().map(|row| row.get(0)).collect())
    }
}

#[derive(Debug, Serialize, Deserialize, FromSql, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "space_members")]
pub struct SpaceMember {
    pub user_id: Uuid,
    pub space_id: Uuid,
    pub is_admin: bool,
    pub join_date: DateTime<Utc>,
}

impl SpaceMember {
    pub async fn set_admin<T: Querist>(
        db: &mut T,
        user_id: &Uuid,
        space_id: &Uuid,
        is_admin: bool,
    ) -> Result<Option<SpaceMember>, DbError> {
        SpaceMember::set(db, user_id, space_id, Some(is_admin)).await
    }

    async fn set<T: Querist>(
        db: &mut T,
        user_id: &Uuid,
        space_id: &Uuid,
        is_admin: Option<bool>,
    ) -> Result<Option<SpaceMember>, DbError> {
        let row = db
            .query_one(
                include_str!("sql/set_space_member.sql"),
                &[&is_admin, user_id, space_id],
            )
            .await;
        inner_result_map(row, |row| row.try_get(0))
    }

    pub async fn remove_user<T: Querist>(db: &mut T, user_id: &Uuid, space_id: &Uuid) -> Result<Vec<Uuid>, DbError> {
        db.execute(include_str!("sql/remove_user_from_space.sql"), &[user_id, space_id])
            .await?;
        ChannelMember::remove_user_by_space(db, user_id, space_id).await
    }

    pub async fn add_admin<T: Querist>(db: &mut T, user_id: &Uuid, space_id: &Uuid) -> Result<SpaceMember, DbError> {
        db.query_exactly_one(include_str!("sql/add_user_to_space.sql"), &[user_id, space_id, &true])
            .await
            .map(|row| row.get(1))
    }

    pub async fn add_user<T: Querist>(db: &mut T, user_id: &Uuid, space_id: &Uuid) -> Result<SpaceMember, DbError> {
        db.query_exactly_one(include_str!("sql/add_user_to_space.sql"), &[user_id, space_id, &false])
            .await
            .map(|row| row.get(1))
    }

    pub async fn get<T: Querist>(db: &mut T, user_id: &Uuid, space_id: &Uuid) -> Result<Option<SpaceMember>, DbError> {
        let result = db
            .query_one(include_str!("sql/get_space_member.sql"), &[user_id, space_id])
            .await;
        inner_result_map(result, |row| row.try_get(0))
    }

    pub async fn get_by_channel<T: Querist>(
        db: &mut T,
        user_id: &Uuid,
        channel_id: &Uuid,
    ) -> Result<Option<SpaceMember>, DbError> {
        let rows = db
            .query(include_str!("sql/get_members_by_channel.sql"), &[user_id, channel_id])
            .await?;
        Ok(rows.into_iter().next().map(|row| row.get(0)))
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
    pub async fn get_by_space<T: Querist>(
        db: &mut T,
        space_id: &Uuid,
    ) -> Result<HashMap<Uuid, SpaceMemberWithUser>, DbError> {
        let members = db
            .query(include_str!("sql/get_members_by_spaces.sql"), &[space_id])
            .await?
            .into_iter()
            .map(|row| {
                let value = SpaceMemberWithUser {
                    space: row.get(0),
                    user: row.get(1),
                };
                let key = value.user.id;
                (key, value)
            });
        Ok(members.collect())
    }
}

#[derive(Debug, Serialize, Deserialize, FromSql)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "restrained_members")]
pub struct RestrainedMember {
    pub user_id: Uuid,
    pub space_id: Uuid,
    pub blocked: bool,
    pub muted: bool,
    pub restrained_date: DateTime<Utc>,
    pub operator_id: Option<Uuid>,
}

impl RestrainedMember {}
