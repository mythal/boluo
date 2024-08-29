use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use ts_rs::TS;
use uuid::Uuid;

use crate::error::{AppError, ModelError, ValidationFailed};
use crate::utils::merge_blank;
use crate::validators::CHARACTER_NAME;

pub fn check_pos((p, q): (i32, i32)) -> Result<(), ValidationFailed> {
    if q == 0 {
        return Err(ValidationFailed(r#""pos_q" cannot be 0"#));
    }
    if p < 0 || q < 0 {
        return Err(ValidationFailed(r#""pos_p" and "pos_q" cannot be negative numbers"#));
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
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
    pub pos_p: i32,
    pub pos_q: i32,
    pub pos: f64,
    /// The color of the message
    ///
    /// The string is not always a hex color, it can be a preset color name like "preset:orange",
    /// or refer to a character's name like "char:DM".
    ///
    /// If the string contains a semicolon, the second part is for the dark mode.
    pub color: String,
}

// Expand from `sqlx::Type` to workaround
// https://github.com/launchbadge/sqlx/issues/1031
impl<'r> ::sqlx::decode::Decode<'r, ::sqlx::Postgres> for Message {
    fn decode(
        value: ::sqlx::postgres::PgValueRef<'r>,
    ) -> ::std::result::Result<
        Self,
        ::std::boxed::Box<dyn ::std::error::Error + 'static + ::std::marker::Send + ::std::marker::Sync>,
    > {
        let mut decoder = ::sqlx::postgres::types::PgRecordDecoder::new(value)?;
        let id = decoder.try_decode::<Uuid>()?;
        let sender_id = decoder.try_decode::<Uuid>()?;
        let channel_id = decoder.try_decode::<Uuid>()?;
        let parent_message_id = decoder.try_decode::<Option<Uuid>>()?;
        let name = decoder.try_decode::<String>()?;
        let media_id = decoder.try_decode::<Option<Uuid>>()?;
        let seed = decoder.try_decode::<Vec<u8>>()?;
        let deleted = decoder.try_decode::<bool>()?;
        let in_game = decoder.try_decode::<bool>()?;
        let is_action = decoder.try_decode::<bool>()?;
        let is_master = decoder.try_decode::<bool>()?;
        let pinned = decoder.try_decode::<bool>()?;
        let tags = decoder.try_decode::<Vec<String>>()?;
        let folded = decoder.try_decode::<bool>()?;
        let text = decoder.try_decode::<String>()?;
        let whisper_to_users = decoder.try_decode::<Option<Vec<Uuid>>>()?;
        let entities = decoder.try_decode::<JsonValue>()?;
        let created = decoder.try_decode::<DateTime<Utc>>()?;
        let modified = decoder.try_decode::<DateTime<Utc>>()?;
        let order_date = decoder.try_decode::<DateTime<Utc>>()?;
        let order_offset = decoder.try_decode::<i32>()?;
        let pos_p = decoder.try_decode::<i32>()?;
        let pos_q = decoder.try_decode::<i32>()?;
        let pos = decoder.try_decode::<f64>()?;
        let color = decoder.try_decode::<String>()?;
        ::std::result::Result::Ok(Message {
            id,
            sender_id,
            channel_id,
            parent_message_id,
            name,
            media_id,
            seed,
            deleted,
            in_game,
            is_action,
            is_master,
            pinned,
            tags,
            folded,
            text,
            whisper_to_users,
            entities,
            created,
            modified,
            order_date,
            order_offset,
            color,
            pos,
            pos_p,
            pos_q,
        })
    }
}
impl ::sqlx::Type<::sqlx::Postgres> for Message {
    fn type_info() -> ::sqlx::postgres::PgTypeInfo {
        ::sqlx::postgres::PgTypeInfo::with_name("messages")
    }
}

impl Message {
    pub async fn get<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
        user_id: Option<&Uuid>,
    ) -> Result<Option<Message>, sqlx::Error> {
        let result = sqlx::query_file!("sql/messages/get.sql", id, user_id)
            .fetch_optional(db)
            .await?;
        if let Some(record) = result {
            let mut message: Message = record.message;
            if record.should_hide {
                message.hide();
            }
            Ok(Some(message))
        } else {
            Ok(None)
        }
    }

    pub async fn query_by_pos<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
        (p, q): (i32, i32),
    ) -> Result<Option<Message>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/messages/by_pos.sql", channel_id, p, q)
            .fetch_optional(db)
            .await
    }

    pub async fn get_by_channel<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
        before: Option<f64>,
        limit: i64,
    ) -> Result<Vec<Message>, ModelError> {
        if !(1..=256).contains(&limit) {
            return Err(ValidationFailed("illegal limit range").into());
        }
        let mut messages = sqlx::query_file_scalar!("sql/messages/get_by_channel.sql", channel_id, before, limit)
            .fetch_all(db)
            .await?;
        for message in messages.iter_mut() {
            message.hide();
        }
        Ok(messages)
    }

    pub async fn export<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
        _hide: bool,
        after: Option<DateTime<Utc>>,
    ) -> Result<Vec<Message>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/messages/export.sql", channel_id, after)
            .fetch_all(db)
            .await
    }

    pub async fn create(
        conn: &mut sqlx::PgConnection,
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
        color: String,
    ) -> Result<Message, AppError> {
        let pos: (i32, i32) = match (request_pos, preview_id) {
            (Some(pos), _) => pos,
            (None, Some(id)) => (crate::pos::pos(&mut *conn, cache, *channel_id, *id, 30).await?, 1),
            (None, None) => (crate::pos::alloc_new_pos(&mut *conn, cache, *channel_id).await?, 1),
        };
        check_pos(pos)?;

        let mut name = merge_blank(name);
        if name.is_empty() {
            name = default_name.trim().to_string();
        }
        CHARACTER_NAME.run(&name)?;
        if text.trim().is_empty() || entities.is_empty() {
            return Err(ValidationFailed("Empty content").into());
        }
        let whisper_to = whisper_to.as_deref();
        let entities = JsonValue::Array(entities);
        let mut row = sqlx::query_file_scalar!(
            "sql/messages/create.sql",
            sender_id,
            channel_id,
            &name,
            text,
            entities,
            in_game,
            is_action,
            is_master,
            whisper_to,
            media_id,
            pos.0,
            pos.1,
            color
        )
        .fetch_one(&mut *conn)
        .await;

        let is_unique_violation = if let Err(err) = &row {
            err.as_database_error()
                .map(|e| e.is_unique_violation())
                .unwrap_or(false)
        } else {
            false
        };

        if is_unique_violation {
            log::warn!(
                "A conflict occurred while creating a new message at channel {}",
                channel_id
            );
            crate::pos::reset_channel_pos(cache, channel_id).await?;
            let p = crate::pos::alloc_new_pos(&mut *conn, cache, *channel_id).await?;
            let q = 1i32;
            row = sqlx::query_file_scalar!(
                "sql/messages/create.sql",
                sender_id,
                channel_id,
                &name,
                text,
                entities,
                in_game,
                is_action,
                is_master,
                whisper_to,
                media_id,
                p,
                q,
                color
            )
            .fetch_one(&mut *conn)
            .await;
        }

        let mut message = row?;
        if let Some(preview_id) = preview_id {
            crate::pos::finished(cache, *channel_id, *preview_id).await?;
        }
        message.hide();
        tokio::spawn(async move {
            let created = message.created;
            let channel_id = message.channel_id;
            super::tasks::WAIT_UPDATE.lock().await.insert(channel_id, created);
        });
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

    pub async fn move_above<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
        message_id: &Uuid,
        pos: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        check_pos(pos)?;

        sqlx::query_file_scalar!("sql/messages/move_above.sql", channel_id, message_id, pos.0, pos.1)
            .fetch_optional(db)
            .await
            .map_err(Into::into)
    }

    pub async fn move_bottom<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
        message_id: &Uuid,
        pos: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        check_pos(pos)?;
        sqlx::query_file_scalar!("sql/messages/move_bottom.sql", channel_id, message_id, pos.0, pos.1)
            .fetch_optional(db)
            .await
            .map_err(Into::into)
    }

    pub async fn move_between<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
        a: (i32, i32),
        b: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        check_pos(a)?;
        check_pos(b)?;
        if a == b {
            sqlx::query_file_scalar!("sql/messages/set_position.sql", id, a.0, a.1)
                .fetch_optional(db)
                .await
        } else {
            sqlx::query_file_scalar!("sql/messages/move_between.sql", id, a.0, a.1, b.0, b.1)
                .fetch_optional(db)
                .await
        }
        .map_err(Into::into)
    }
    pub async fn max_pos<'c, T: sqlx::PgExecutor<'c>>(db: T, channel_id: &Uuid) -> (i32, i32) {
        sqlx::query_file!("sql/messages/max_pos.sql", channel_id)
            .fetch_one(db)
            .await
            .map(|row| (row.pos_p, row.pos_q))
            .unwrap_or((42, 1))
    }
    pub async fn set_folded<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
        folded: bool,
    ) -> Result<Option<Message>, ModelError> {
        sqlx::query_file_scalar!("sql/messages/set_folded.sql", id, &folded)
            .fetch_optional(db)
            .await
            .map_err(Into::into)
    }
    pub async fn edit<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        name: &str,
        id: &Uuid,
        text: &str,
        entities: Vec<JsonValue>,
        in_game: bool,
        is_action: bool,
        media_id: Option<Uuid>,
        color: String,
    ) -> Result<Option<Message>, ModelError> {
        let entities = JsonValue::Array(entities);
        let name = merge_blank(name);
        CHARACTER_NAME.run(&name)?;
        let result = sqlx::query_file_scalar!(
            "sql/messages/edit.sql",
            id,
            &name,
            text,
            entities,
            in_game,
            is_action,
            media_id,
            color
        )
        .fetch_optional(db)
        .await?;
        if let Some(mut message) = result {
            message.hide();
            Ok(Some(message))
        } else {
            Ok(None)
        }
    }

    pub async fn delete<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<u64, sqlx::Error> {
        sqlx::query_file!("sql/messages/delete.sql", id)
            .execute(db)
            .await
            .map(|res| res.rows_affected())
    }
}
