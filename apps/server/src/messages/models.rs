use chrono::prelude::*;
use postgres_types::FromSql;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use ts_rs::TS;
use uuid::Uuid;

use crate::database::Querist;
use crate::error::{AppError, DbError, ModelError, ValidationFailed};
use crate::utils::merge_blank;
use crate::validators::CHARACTER_NAME;
use tokio_postgres::error::SqlState;

pub fn check_pos((p, q): (i32, i32)) -> Result<(), ValidationFailed> {
    if q == 0 {
        return Err(ValidationFailed(r#""pos_q" cannot be 0"#));
    }
    if p < 0 || q < 0 {
        return Err(ValidationFailed(r#""pos_p" and "pos_q" cannot be negative numbers"#));
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, FromSql, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "messages")]
pub struct Message {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub channel_id: Uuid,
    pub parent_message_id: Option<Uuid>,
    pub name: String,
    pub media_id: Option<Uuid>,
    pub seed: Vec<u8>,
    #[serde(skip)]
    pub deleted: bool,
    pub in_game: bool,
    pub is_action: bool,
    pub is_master: bool,
    pub pinned: bool,
    pub tags: Vec<String>,
    pub folded: bool,
    pub text: String,
    pub whisper_to_users: Option<Vec<Uuid>>,
    #[ts(type = "unknown")]
    pub entities: JsonValue,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
    pub order_date: DateTime<Utc>,
    pub order_offset: i32,
    pub pos: f64,
    pub pos_p: i32,
    pub pos_q: i32,
}

impl Message {
    pub async fn get<T: Querist>(db: &mut T, id: &Uuid, user_id: Option<&Uuid>) -> Result<Option<Message>, DbError> {
        let row = db.query_one(include_str!("sql/get.sql"), &[id, &user_id]).await?;
        if let Some(row) = row {
            let mut message: Message = row.try_get(0)?;
            let should_hide: Option<bool> = row.try_get(1)?;
            if should_hide.unwrap_or(true) {
                message.hide();
            }
            Ok(Some(message))
        } else {
            Ok(None)
        }
    }

    pub async fn query_by_pos<T: Querist>(
        db: &mut T,
        channel_id: &Uuid,
        (p, q): (i32, i32),
    ) -> Result<Option<Message>, DbError> {
        let row = db
            .query_one(include_str!("sql/by_pos.sql"), &[channel_id, &p, &q])
            .await?;
        let maybe_message = if let Some(row) = row { row.try_get(0)? } else { None };
        Ok(maybe_message)
    }

    pub async fn get_by_channel<T: Querist>(
        db: &mut T,
        channel_id: &Uuid,
        before: Option<f64>,
        limit: i32,
    ) -> Result<Vec<Message>, ModelError> {
        use postgres_types::Type;
        if !(1..=256).contains(&limit) {
            return Err(ValidationFailed("illegal limit range").into());
        }
        let rows = db
            .query_typed(
                include_str!("sql/get_by_channel.sql"),
                &[Type::UUID, Type::FLOAT8, Type::INT4],
                &[channel_id, &before, &limit],
            )
            .await?;
        let mut messages: Vec<Message> = vec![];
        for row in rows {
            messages.push(row.try_get(0)?);
        }
        messages.iter_mut().for_each(Message::hide);
        Ok(messages)
    }

    pub async fn export<T: Querist>(
        db: &mut T,
        channel_id: &Uuid,
        hide: bool,
        after: Option<DateTime<Utc>>,
    ) -> Result<Vec<Message>, DbError> {
        let rows = db
            .query(include_str!("./sql/export.sql"), &[channel_id, &after])
            .await?;
        let mut messages: Vec<Message> = vec![];
        for row in rows {
            messages.push(row.try_get(0)?);
        }
        if hide {
            messages.iter_mut().for_each(Message::hide);
        }
        Ok(messages)
    }

    pub async fn create<T: Querist>(
        db: &mut T,
        cache: &mut crate::cache::Connection,
        preview_id: Option<&Uuid>,
        channel_id: &Uuid,
        sender_id: &Uuid,
        default_name: &str,
        name: &str,
        text: &str,
        entities: Vec<JsonValue>,
        in_game: bool,
        is_action: bool,
        is_master: bool,
        whisper_to: Option<Vec<Uuid>>,
        media_id: Option<Uuid>,
        request_pos: Option<(i32, i32)>,
    ) -> Result<Message, AppError> {
        use postgres_types::Type;
        let pos: (i32, i32) = match (request_pos, preview_id) {
            (Some(pos), _) => pos,
            (None, Some(id)) => (crate::pos::pos(db, cache, *channel_id, *id).await?, 1),
            (None, None) => (crate::pos::alloc_new_pos(db, cache, *channel_id).await?, 1),
        };
        check_pos(pos)?;

        let mut name = merge_blank(name);
        if name.is_empty() {
            name = default_name.trim().to_string();
        }
        CHARACTER_NAME.run(&name)?;
        if text.is_empty() {
            return Err(ValidationFailed("Text is empty.").into());
        }
        let entities = JsonValue::Array(entities);
        let source = include_str!("sql/create.sql");
        let types = &[
            Type::UUID,
            Type::UUID,
            Type::TEXT,
            Type::TEXT,
            Type::JSON,
            Type::BOOL,
            Type::BOOL,
            Type::BOOL,
            Type::UUID_ARRAY,
            Type::UUID,
            Type::INT4,
            Type::INT4,
        ];
        let mut row = db
            .query_exactly_one_typed(
                source,
                types,
                &[
                    sender_id,
                    channel_id,
                    &name,
                    &text,
                    &entities,
                    &in_game,
                    &is_action,
                    &is_master,
                    &whisper_to,
                    &media_id,
                    &pos.0,
                    &pos.1,
                ],
            )
            .await;
        if let Err(err) = &row {
            if err.code() == Some(&SqlState::UNIQUE_VIOLATION) {
                log::warn!(
                    "A conflict occurred while creating a new message at channel {}",
                    channel_id
                );
                crate::pos::reset_channel_pos(cache, channel_id).await?;
                let p = crate::pos::alloc_new_pos(db, cache, *channel_id).await?;
                let q = 1i32;
                row = db
                    .query_exactly_one_typed(
                        source,
                        types,
                        &[
                            sender_id,
                            channel_id,
                            &name,
                            &text,
                            &entities,
                            &in_game,
                            &is_action,
                            &is_master,
                            &whisper_to,
                            &media_id,
                            &p,
                            &q,
                        ],
                    )
                    .await;
            }
        }
        let mut message: Message = row?.try_get(0)?;
        if let Some(preview_id) = preview_id {
            crate::pos::finished(cache, *channel_id, *preview_id).await?;
        }
        message.hide();
        Ok(message)
    }

    pub fn hide(&mut self) {
        if self.whisper_to_users.is_none() {
            return;
        }
        self.seed = vec![0; 4];
        self.text = String::new();
        self.entities = JsonValue::Array(Vec::new());
    }

    pub async fn move_above<T: Querist>(
        db: &mut T,
        channel_id: &Uuid,
        message_id: &Uuid,
        pos: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        use postgres_types::Type;
        check_pos(pos)?;

        let row = db
            .query_one_typed(
                include_str!("sql/move_above.sql"),
                &[Type::UUID, Type::UUID, Type::INT4, Type::INT4],
                &[channel_id, message_id, &pos.0, &pos.1],
            )
            .await?;
        if let Some(row) = row {
            Ok(row.try_get(0)?)
        } else {
            Ok(None)
        }
    }

    pub async fn move_bottom<T: Querist>(
        db: &mut T,
        channel_id: &Uuid,
        message_id: &Uuid,
        pos: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        use postgres_types::Type;
        check_pos(pos)?;

        let row = db
            .query_one_typed(
                include_str!("sql/move_bottom.sql"),
                &[Type::UUID, Type::UUID, Type::INT4, Type::INT4],
                &[channel_id, message_id, &pos.0, &pos.1],
            )
            .await?;
        if let Some(row) = row {
            Ok(Some(row.try_get(0)?))
        } else {
            Ok(None)
        }
    }

    pub async fn move_between<T: Querist>(
        db: &mut T,
        id: &Uuid,
        a: (i32, i32),
        b: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        use postgres_types::Type;
        check_pos(a)?;
        check_pos(b)?;
        let row = if a == b {
            db.query_one_typed(
                include_str!("sql/set_position.sql"),
                &[Type::UUID, Type::INT4, Type::INT4],
                &[id, &a.0, &a.1],
            )
            .await?
        } else {
            db.query_one_typed(
                include_str!("sql/move_between.sql"),
                &[Type::UUID, Type::INT4, Type::INT4, Type::INT4, Type::INT4],
                &[id, &a.0, &a.1, &b.0, &b.1],
            )
            .await?
        };
        if let Some(row) = row {
            Ok(Some(row.try_get(0)?))
        } else {
            Ok(None)
        }
    }
    pub async fn max_pos<T: Querist>(db: &mut T, channel_id: &Uuid) -> (i32, i32) {
        let row = db.query_one(include_str!("./sql/max_pos.sql"), &[channel_id]).await;
        if let Ok(Some(row)) = row {
            (row.get(0), row.get(1))
        } else {
            (42, 1)
        }
    }
    pub async fn set_folded<T: Querist>(db: &mut T, id: &Uuid, folded: bool) -> Result<Option<Message>, ModelError> {
        let row = db.query_one(include_str!("sql/set_folded.sql"), &[id, &folded]).await?;
        if let Some(row) = row {
            Ok(Some(row.try_get(0)?))
        } else {
            Ok(None)
        }
    }
    pub async fn edit<T: Querist>(
        db: &mut T,
        name: &str,
        id: &Uuid,
        text: &str,
        entities: Vec<JsonValue>,
        in_game: bool,
        is_action: bool,
        media_id: Option<Uuid>,
    ) -> Result<Option<Message>, ModelError> {
        let entities = JsonValue::Array(entities);
        let name = merge_blank(name);
        CHARACTER_NAME.run(&name)?;
        let row = db
            .query_one(
                include_str!("sql/edit.sql"),
                &[id, &&*name, &text, &entities, &in_game, &is_action, &media_id],
            )
            .await?;
        if let Some(row) = row {
            let mut message: Message = row.try_get(0)?;
            message.hide();
            Ok(Some(message))
        } else {
            Ok(None)
        }
    }

    pub async fn delete<T: Querist>(db: &mut T, id: &Uuid) -> Result<u64, DbError> {
        db.execute(include_str!("sql/delete.sql"), &[id]).await
    }
}

#[tokio::test]
async fn message_test() -> Result<(), crate::error::AppError> {
    use crate::channels::{Channel, ChannelMember};
    use crate::database::Client;
    use crate::spaces::Space;
    use crate::spaces::SpaceMember;
    use crate::users::User;

    let mut cache = crate::cache::conn().await.unwrap();
    let mut client = Client::new().await?;

    let mut trans = client.transaction().await?;
    let db = &mut trans;

    let email = "sayaka@mythal.net";
    let username = "sayaka";
    let password = "no password";
    let nickname = "Test User";
    let space_name = "Test Space";

    let user = User::register(db, email, username, nickname, password).await.unwrap();
    let space = Space::create(db, space_name.to_string(), &user.id, String::new(), None, None).await?;
    SpaceMember::add_admin(db, &user.id, &space.id).await?;

    let channel_name = "Test Channel";
    let channel = Channel::create(db, &space.id, channel_name, true, None).await?;

    ChannelMember::add_user(db, &user.id, &channel.id, "", false).await?;
    ChannelMember::set_master(db, &user.id, &channel.id, true).await?;
    let text = "hello, world";
    let message = Message::create(
        db,
        &mut cache,
        None,
        &channel.id,
        &user.id,
        "",
        &user.nickname,
        text,
        vec![],
        true,
        false,
        true,
        Some(vec![]),
        Some(Uuid::nil()),
        None,
    )
    .await
    .unwrap();
    assert_eq!(message.text, "");

    let message = Message::get(db, &message.id, Some(&user.id)).await?.unwrap();
    assert_eq!(message.text, text);

    let new_text = "cocona";
    let edited = Message::edit(db, "new name", &message.id, new_text, vec![], false, false, None)
        .await?
        .unwrap();
    assert_eq!(edited.text, "");

    let message = Message::get(db, &message.id, Some(&user.id)).await?.unwrap();
    assert_eq!(message.text, new_text);
    let message_by_pos = Message::query_by_pos(db, &message.channel_id, (message.pos_p, message.pos_q))
        .await?
        .unwrap();
    assert_eq!(message_by_pos.id, message.id);
    ChannelMember::set_master(db, &user.id, &channel.id, false).await?;
    let a = Message::get(db, &message.id, Some(&user.id)).await?.unwrap();
    assert_eq!(a.text, "");
    let messages = Message::get_by_channel(db, &channel.id, None, 128).await?;
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0].id, a.id);

    let b = Message::create(
        db,
        &mut cache,
        None,
        &channel.id,
        &user.id,
        "orange",
        &user.nickname,
        "腰不舒服！",
        vec![],
        true,
        false,
        true,
        None,
        Some(Uuid::nil()),
        None,
    )
    .await
    .unwrap();
    let messages = Message::get_by_channel(db, &channel.id, None, 128).await?;
    assert_eq!(messages.len(), 2);
    assert_eq!(messages[0].text, b.text);

    let c = Message::create(
        db,
        &mut cache,
        None,
        &channel.id,
        &user.id,
        "orange",
        &user.nickname,
        "昨天我打了疫苗，已经是变种人了！",
        vec![],
        true,
        false,
        true,
        None,
        Some(Uuid::nil()),
        None,
    )
    .await
    .unwrap();
    let a = (messages[1].pos_p, messages[1].pos_q);
    let b = (messages[0].pos_p, messages[0].pos_q);
    Message::move_between(db, &c.id, a, b).await.unwrap().unwrap();
    let messages = Message::get_by_channel(db, &channel.id, None, 128).await?;
    assert_eq!(messages.len(), 3);
    assert_eq!(messages[1].id, c.id);
    Message::move_above(db, &c.channel_id, &c.id, (messages[2].pos_p, messages[2].pos_q)).await?;
    let messages = Message::get_by_channel(db, &channel.id, None, 128).await?;
    assert_eq!(messages[2].id, c.id);
    Message::move_bottom(db, &c.channel_id, &c.id, (messages[0].pos_p, messages[0].pos_q)).await?;
    let messages = Message::get_by_channel(db, &channel.id, None, 128).await?;
    assert_eq!(messages[0].id, c.id);
    Ok(())
}
