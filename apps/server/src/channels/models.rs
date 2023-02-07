use chrono::prelude::*;
use postgres_types::FromSql;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

use crate::channels::api::{ChannelMemberWithUser, ChannelWithMember};
use crate::database::Querist;
use crate::error::{DbError, ModelError};
use crate::spaces::{Space, SpaceMember};
use crate::users::User;
use crate::utils::{inner_result_map, merge_blank};
use std::collections::HashMap;
use tokio_postgres::Row;

#[derive(Debug, Clone, Serialize, Deserialize, FromSql, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "channels")]
pub struct Channel {
    pub id: Uuid,
    pub name: String,
    pub topic: String,
    pub space_id: Uuid,
    pub created: DateTime<Utc>,
    pub is_public: bool,
    pub is_document: bool,
    pub old_name: String,
    #[serde(skip)]
    pub deleted: bool,
    pub default_dice_type: String,
    pub default_roll_command: String,
}

impl Channel {
    pub async fn create<T: Querist>(
        db: &mut T,
        space_id: &Uuid,
        name: &str,
        is_public: bool,
        default_dice_type: Option<&str>,
    ) -> Result<Channel, ModelError> {
        use crate::validators;

        let name = merge_blank(name);
        validators::DISPLAY_NAME.run(&name)?;
        if let Some(default_dice_type) = default_dice_type {
            validators::DICE.run(default_dice_type)?;
        }

        let row = db
            .query_exactly_one(
                include_str!("sql/create_channel.sql"),
                &[space_id, &name, &is_public, &default_dice_type],
            )
            .await?;

        Ok(row.try_get(0)?)
    }

    pub async fn get_by_id<T: Querist>(db: &mut T, id: &Uuid) -> Result<Option<Channel>, DbError> {
        let result = db.query_one(include_str!("sql/fetch_channel.sql"), &[&id]).await;
        inner_result_map(result, |row| row.try_get(0))
    }

    pub async fn get_by_name<T: Querist>(db: &mut T, space_id: Uuid, name: &str) -> Result<Option<Channel>, DbError> {
        let result = db
            .query_one(include_str!("sql/get_channel_by_name.sql"), &[&space_id, &name])
            .await;
        inner_result_map(result, |row| row.try_get(0))
    }

    pub async fn get_with_space<T: Querist>(db: &mut T, id: &Uuid) -> Result<Option<(Channel, Space)>, DbError> {
        let row = db
            .query_one(include_str!("sql/fetch_channel_with_space.sql"), &[&id])
            .await?;
        if let Some(row) = row {
            Ok(Some((row.try_get(0)?, row.try_get(1)?)))
        } else {
            Ok(None)
        }
    }

    pub async fn get_by_space<T: Querist>(db: &mut T, space_id: &Uuid) -> Result<Vec<Channel>, DbError> {
        let rows = db.query(include_str!("sql/get_by_space.sql"), &[space_id]).await?;
        Ok(rows.into_iter().map(|row| row.get(0)).collect())
    }

    pub async fn delete<T: Querist>(db: &mut T, id: &Uuid) -> Result<u64, DbError> {
        db.execute(include_str!("sql/delete_channel.sql"), &[id]).await
    }

    pub async fn edit<T: Querist>(
        db: &mut T,
        id: &Uuid,
        name: Option<&str>,
        topic: Option<&str>,
        default_dice_type: Option<&str>,
        default_roll_command: Option<&str>,
        is_public: Option<bool>,
        is_document: Option<bool>,
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
        let row = db
            .query_exactly_one(
                include_str!("sql/edit_channel.sql"),
                &[
                    id,
                    &name,
                    &topic,
                    &default_dice_type,
                    &default_roll_command,
                    &is_public,
                    &is_document,
                ],
            )
            .await?;
        Ok(row.try_get(0)?)
    }

    pub async fn max_pos<T: Querist>(db: &mut T) -> Result<Vec<(Uuid, f64)>, DbError> {
        let rows = db.query(include_str!("sql/channel_max_pos.sql"), &[]).await?;
        let result: Vec<(Uuid, f64)> = rows.into_iter().map(|row| (row.get(0), row.get(1))).collect();
        Ok(result)
    }

    pub async fn get_by_user<T: Querist>(db: &mut T, user_id: Uuid) -> Result<Vec<ChannelWithMember>, DbError> {
        let rows = db
            .query(include_str!("sql/get_channels_by_user.sql"), &[&user_id])
            .await?;
        let joined_channels = rows
            .into_iter()
            .map(|row| ChannelWithMember {
                channel: row.get(0),
                member: row.get(1),
            })
            .collect();
        Ok(joined_channels)
    }
}

#[derive(Debug, Serialize, Deserialize, FromSql, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "channel_members")]
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

impl ChannelMember {
    pub async fn add_user<T: Querist>(
        db: &mut T,
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
        let row = db
            .query_exactly_one(
                include_str!("sql/add_user_to_channel.sql"),
                &[user_id, channel_id, &character_name, &is_master],
            )
            .await?;
        Ok(row.try_get(1)?)
    }

    pub async fn get_color_list<T: Querist>(db: &mut T, channel_id: &Uuid) -> Result<HashMap<Uuid, String>, DbError> {
        let rows = db.query(include_str!("sql/get_color_list.sql"), &[channel_id]).await?;
        Ok(rows.into_iter().map(|row| (row.get(0), row.get(1))).collect())
    }

    pub async fn get_by_space<T: Querist>(
        db: &mut T,
        space_id: &Uuid,
    ) -> Result<HashMap<Uuid, Vec<ChannelMember>>, DbError> {
        let rows = db
            .query(include_str!("sql/get_channel_member_list_by_space.sql"), &[space_id])
            .await?;
        let mut channel_member_map: HashMap<Uuid, Vec<ChannelMember>> = HashMap::new();
        for row in rows {
            let member: ChannelMember = row.try_get(0)?;
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

    pub async fn get_by_channel<T: Querist>(
        db: &mut T,
        channel: &Uuid,
        full: bool,
    ) -> Result<Vec<ChannelMemberWithUser>, DbError> {
        let rows = db
            .query(include_str!("sql/get_channel_member_list.sql"), &[channel, &full])
            .await?;
        let mapper = |row: Row| ChannelMemberWithUser {
            member: row.get(0),
            user: row.get(1),
        };
        Ok(rows.into_iter().map(mapper).collect())
    }

    pub async fn is_master<T: Querist>(db: &mut T, user_id: &Uuid, channel_id: &Uuid) -> Result<bool, DbError> {
        let is_master = db
            .query(include_str!("sql/is_master.sql"), &[user_id, channel_id])
            .await?
            .into_iter()
            .next()
            .map(|row| row.get(0))
            .unwrap_or(false);
        Ok(is_master)
    }

    pub async fn get_with_space_member<T: Querist>(
        db: &mut T,
        user_id: &Uuid,
        channel_id: &Uuid,
    ) -> Result<Option<(ChannelMember, SpaceMember)>, DbError> {
        let mut rows = db
            .query(include_str!("sql/get_with_space_member.sql"), &[user_id, channel_id])
            .await?;
        Ok(rows.pop().map(|row| (row.get(0), row.get(1))))
    }

    pub async fn get<T: Querist>(db: &mut T, user: &Uuid, channel: &Uuid) -> Result<Option<ChannelMember>, DbError> {
        let row = db
            .query_one(include_str!("sql/get_channel_member.sql"), &[user, channel])
            .await?;
        Ok(row.map(|row| row.get(0)))
    }

    pub async fn remove_user<T: Querist>(db: &mut T, user_id: &Uuid, channel_id: &Uuid) -> Result<u64, DbError> {
        db.execute(include_str!("sql/remove_user_from_channel.sql"), &[user_id, channel_id])
            .await
    }

    pub async fn remove_user_by_space<T: Querist>(
        db: &mut T,
        user_id: &Uuid,
        space_id: &Uuid,
    ) -> Result<Vec<Uuid>, DbError> {
        let channels = db
            .query(include_str!("sql/remove_user_by_space.sql"), &[user_id, space_id])
            .await?
            .into_iter()
            .map(|row| row.get(0));
        Ok(channels.collect())
    }

    pub async fn edit<T: Querist>(
        db: &mut T,
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
        let row = db
            .query_one(
                include_str!("sql/edit_member.sql"),
                &[&user_id, &channel_id, &character_name, &text_color],
            )
            .await?;
        Ok(row.map(|row| row.get(0)))
    }

    pub async fn set_name<T: Querist>(
        db: &mut T,
        user_id: &Uuid,
        channel_id: &Uuid,
        character_name: &str,
    ) -> Result<Option<ChannelMember>, ModelError> {
        ChannelMember::edit(db, *user_id, *channel_id, Some(character_name), None).await
    }

    pub async fn set_color<T: Querist>(
        db: &mut T,
        user_id: &Uuid,
        channel_id: &Uuid,
        color: &str,
    ) -> Result<Option<ChannelMember>, ModelError> {
        ChannelMember::edit(db, *user_id, *channel_id, None, Some(color)).await
    }

    pub async fn set_master<T: Querist>(
        db: &mut T,
        user_id: &Uuid,
        channel_id: &Uuid,
        is_master: bool,
    ) -> Result<Option<ChannelMember>, DbError> {
        let result = db
            .query_one(include_str!("sql/set_master.sql"), &[user_id, channel_id, &is_master])
            .await;
        inner_result_map(result, |row| row.try_get(0))
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
    fn mapper(row: tokio_postgres::Row) -> Member {
        let channel: ChannelMember = row.get(0);
        let space: SpaceMember = row.get(1);
        let user: User = row.get(2);
        Member { channel, space, user }
    }

    pub async fn get_by_channel<T: Querist>(db: &mut T, channel_id: Uuid) -> Result<Vec<Member>, DbError> {
        use postgres_types::Type;
        let none_uuid: Option<Uuid> = None;
        let rows = db
            .query_typed(
                include_str!("sql/get_members_information_by_channel.sql"),
                &[Type::UUID, Type::UUID],
                &[&channel_id, &none_uuid],
            )
            .await?;
        Ok(rows.into_iter().map(Member::mapper).collect())
    }
}

#[tokio::test]
async fn channels_test() -> Result<(), crate::error::AppError> {
    use crate::database::Client;
    use crate::spaces::Space;
    use crate::users::User;

    let mut client = Client::new().await?;
    let mut trans = client.transaction().await?;
    let db = &mut trans;
    let email = "channel_test@mythal.net";
    let username = "channel_test_user";
    let password = "no password";
    let nickname = "Test User";
    let space_name = "Test Space";

    let user = User::register(db, email, username, nickname, password).await?;
    let space = Space::create(db, space_name.to_string(), &user.id, String::new(), None, None).await?;
    let channel_name = "Test Channel";
    let channel = Channel::create(db, &space.id, "Test Channel", true, None).await?;
    let channel = Channel::get_by_id(db, &channel.id).await?.unwrap();
    assert_eq!(channel.space_id, space.id);
    assert_eq!(channel.name, channel_name);

    let space_ = Space::get_by_channel(db, &channel.id).await?.unwrap();
    assert_eq!(space.id, space_.id);

    let channels = Channel::get_by_space(db, &space.id).await?;
    assert_eq!(channels[0].id, channel.id);

    let new_name = "深水城水很深";
    let channel_edited = Channel::edit(db, &channel.id, Some(new_name), None, None, None, Some(false), None).await?;
    assert_eq!(channel_edited.name, new_name);
    assert!(!channel_edited.is_public);
    let (_, space) = Channel::get_with_space(db, &channel.id).await?.unwrap();
    let channel = Channel::get_by_name(db, space.id, new_name).await?.unwrap();
    assert!(Channel::get_by_name(db, space.id, "Madoka").await?.is_none());

    // members
    SpaceMember::add_admin(db, &user.id, &space.id).await?;
    let member = ChannelMember::add_user(db, &user.id, &channel.id, "", false).await?;
    let character_name = "Cocona";
    ChannelMember::set_name(db, &member.user_id, &member.channel_id, character_name).await?;
    let member_altered = ChannelMember::get(db, &user.id, &channel.id).await?.unwrap();
    assert_eq!(member.join_date, member_altered.join_date);
    assert_eq!(member_altered.character_name, character_name);
    let member_fetched = ChannelMember::get_by_channel(db, &channel.id, false)
        .await?
        .into_iter()
        .next()
        .unwrap()
        .member;
    assert_eq!(member_fetched.join_date, member_altered.join_date);
    assert_eq!(member.join_date, member_fetched.join_date);

    ChannelMember::remove_user(db, &user.id, &channel.id).await?;
    assert_eq!(ChannelMember::get_by_channel(db, &channel.id, false).await?.len(), 0);

    ChannelMember::add_user(db, &user.id, &channel.id, "", false)
        .await
        .unwrap();

    let channel_2 = Channel::create(db, &space.id, "Test Channel 2", true, None).await?;
    ChannelMember::add_user(db, &user.id, &channel_2.id, "", false)
        .await
        .unwrap();
    ChannelMember::get(db, &user.id, &channel.id).await.unwrap();

    let joined = Channel::get_by_user(db, user.id).await?;
    assert_eq!(joined.len(), 2);
    assert_eq!(joined[0].member.channel_id, channel.id);
    assert_eq!(joined[1].member.channel_id, channel_2.id);

    let member = Member::get_by_channel(db, channel.id).await?;
    assert_eq!(member.len(), 1);
    ChannelMember::get_by_space(db, &space.id).await?;

    Channel::max_pos(db).await?;

    ChannelMember::remove_user(db, &user.id, &channel.id).await?;
    ChannelMember::remove_user(db, &user.id, &channel_2.id).await?;
    assert!(ChannelMember::get(db, &user.id, &channel.id).await?.is_none());
    assert!(ChannelMember::get(db, &user.id, &channel_2.id).await?.is_none());

    // delete
    Channel::delete(db, &channel.id).await?;
    assert!(Channel::get_by_id(db, &channel.id).await?.is_none());
    Ok(())
}
