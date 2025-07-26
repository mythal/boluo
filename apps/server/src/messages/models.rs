use chrono::prelude::*;

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use types::legacy::LegacyEntity;
use uuid::Uuid;

use crate::error::{AppError, ModelError, ValidationFailed};
use crate::pos::{CHANNEL_POS_MANAGER, FailToFindIntermediate, check_pos, find_intermediate};
use crate::utils::{is_false, merge_blank};
use crate::validators::CHARACTER_NAME;

use crate::notify;

#[derive(Debug, Serialize, Deserialize, Clone, Default, specta::Type)]
pub struct Entities(pub Vec<types::entities::Entity>);

impl sqlx::Encode<'_, sqlx::Postgres> for Entities {
    fn encode_by_ref(
        &self,
        _buf: &mut sqlx::postgres::PgArgumentBuffer,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        let json = serde_json::to_value(&self.0)?;
        sqlx::Encode::encode_by_ref(&json, _buf)
    }
}

// sqlx-postgres/src/types/json.rs
impl sqlx::Decode<'_, sqlx::Postgres> for Entities {
    fn decode(
        value: sqlx::postgres::PgValueRef<'_>,
    ) -> std::result::Result<Self, sqlx::error::BoxDynError> {
        let mut buf = value.as_bytes()?;

        if value.format() == sqlx::postgres::PgValueFormat::Binary {
            if buf[0] != 1 {
                tracing::error!("Invalid JSONB format");
                return Ok(Default::default());
            }
            buf = &buf[1..];
        }
        let entites = serde_json::from_slice::<'_, Entities>(buf);
        match entites {
            Err(_) => match serde_json::from_slice::<'_, Vec<LegacyEntity>>(buf) {
                Ok(legacy_entities) => {
                    let entities = legacy_entities
                        .into_iter()
                        .map(|entity| entity.into())
                        .collect();
                    Ok(Entities(entities))
                }
                Err(err) => {
                    tracing::error!("Failed to decode JSONB: {}", err);
                    Ok(Default::default())
                }
            },
            Ok(entities) => Ok(entities),
        }
    }
}

impl sqlx::Type<sqlx::Postgres> for Entities {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        sqlx::postgres::PgTypeInfo::with_name("jsonb")
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, sqlx::Type)]
#[sqlx(type_name = "messages")]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub channel_id: Uuid,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_message_id: Option<Uuid>,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_id: Option<Uuid>,
    pub seed: Vec<u8>,
    #[serde(skip)]
    pub deleted: bool,
    #[serde(skip_serializing_if = "is_false")]
    pub in_game: bool,
    #[serde(skip_serializing_if = "is_false")]
    pub is_action: bool,
    #[serde(skip_serializing_if = "is_false")]
    pub is_master: bool,
    #[serde(skip_serializing_if = "is_false")]
    pub pinned: bool,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "is_false")]
    pub folded: bool,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub whisper_to_users: Option<Vec<Uuid>>,
    pub entities: Entities,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
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
                message.hide(None);
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
        current_user_id: Option<&Uuid>,
    ) -> Result<Vec<Message>, ModelError> {
        use futures::TryStreamExt as _;
        if !(1..=256).contains(&limit) {
            return Err(ValidationFailed("illegal limit range").into());
        }
        let mut stream =
            sqlx::query_file_scalar!("sql/messages/get_by_channel.sql", channel_id, before, limit)
                .fetch(db);
        let mut messages = Vec::new();
        while let Some(mut message) = stream.try_next().await? {
            message.hide(current_user_id);
            messages.push(message);
        }
        Ok(messages)
    }

    pub async fn export<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
        _hide: bool,
        after: Option<DateTime<Utc>>,
    ) -> Result<Vec<Message>, sqlx::Error> {
        use futures::TryStreamExt as _;

        let mut stream =
            sqlx::query_file_scalar!("sql/messages/export.sql", channel_id, after).fetch(db);

        static UP_TO: usize = 65535;

        let mut messages = Vec::new();

        while let Some(message) = stream.try_next().await? {
            if messages.len() >= UP_TO {
                break;
            }
            messages.push(message);
        }

        Ok(messages)
    }

    pub async fn create(
        conn: &mut sqlx::PgConnection,
        preview_id: Option<Uuid>,
        channel_id: Uuid,
        _space_id: Uuid,
        sender_id: &Uuid,
        default_name: &str,
        name: &str,
        text: &str,
        entities: Entities,
        in_game: bool,
        is_action: bool,
        is_master: bool,
        whisper_to: Option<Vec<Uuid>>,
        media_id: Option<Uuid>,
        request_pos: Option<(i32, i32)>,
        color: String,
    ) -> Result<Message, AppError> {
        let id = Uuid::now_v1(b"server");
        let mut name = merge_blank(name);
        if name.is_empty() {
            name = default_name.trim().to_string();
        }
        CHARACTER_NAME.run(&name)?;
        if text.trim().is_empty() || entities.0.is_empty() {
            return Err(ValidationFailed("Empty content").into());
        }
        let whisper_to = whisper_to.as_deref();
        let entities = serde_json::to_value(entities).unwrap_or(JsonValue::Array(vec![]));

        let pos = crate::pos::CHANNEL_POS_MANAGER
            .sending_new_message(channel_id, id, request_pos, preview_id)
            .await?;
        let mut row: Result<Message, sqlx::Error> = sqlx::query_file_scalar!(
            "sql/messages/create.sql",
            id,
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
            pos.numer(),
            pos.denom(),
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
            metrics::counter!("boluo_server_messages_pos_conflict_total").increment(1);
            let new_pos = crate::pos::CHANNEL_POS_MANAGER
                .on_conflict(channel_id, id)
                .await?;
            tracing::warn!(
                channel_id = channel_id.to_string(),
                allocated_pos = ?pos,
                request_pos = ?request_pos,
                new_pos = ?new_pos,
                preview_id = %preview_id.unwrap_or_default(),
                "A conflict occurred while creating a new message at channel",
            );
            row = sqlx::query_file_scalar!(
                "sql/messages/create.sql",
                id,
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
                new_pos.numer(),
                new_pos.denom(),
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
                tracing::error!(
                    channel_id = %channel_id,
                    pos = ?(new_pos.numer(), new_pos.denom()),
                    "This should never happen, but a unique violation occurred again while creating a message at channel"
                );
                CHANNEL_POS_MANAGER.shutdown(channel_id).await;
                return Err(AppError::Unexpected(anyhow::anyhow!(
                    "Failed to send new message, conflict occurred",
                )));
            }
        }

        let mut message = match row {
            Ok(message) => message,
            Err(err) => {
                tracing::error!(
                    channel_id = %channel_id,
                    err = %err,
                    "Failed to send message at channel"
                );
                crate::pos::CHANNEL_POS_MANAGER.cancel(channel_id, id).await;
                return Err(err.into());
            }
        };
        crate::pos::CHANNEL_POS_MANAGER
            .submitted(channel_id, message.id, message.pos_p, message.pos_q, None)
            .await;
        message.hide(None);

        let created = message.created;

        notify::space_activity(channel_id, Some(created));
        Ok(message)
    }

    pub fn hide(&mut self, current_user_id: Option<&Uuid>) {
        let Some(users) = self.whisper_to_users.as_ref() else {
            return;
        };
        if let Some(id) = current_user_id {
            if users.contains(id) {
                return;
            }
        }
        self.seed = vec![0; 4];
        self.text = String::new();
        self.entities = Default::default();
    }

    pub async fn move_above<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
        message_id: &Uuid,
        pos: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        check_pos(pos)?;

        sqlx::query_file_scalar!(
            "sql/messages/move_above.sql",
            channel_id,
            message_id,
            pos.0,
            pos.1
        )
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
        sqlx::query_file_scalar!(
            "sql/messages/move_bottom.sql",
            channel_id,
            message_id,
            pos.0,
            pos.1
        )
        .fetch_optional(db)
        .await
        .map_err(Into::into)
    }

    pub async fn move_between(
        db: &mut sqlx::PgConnection,
        id: &Uuid,
        channel_id: Uuid,
        a: (i32, i32),
        b: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        check_pos(a)?;
        check_pos(b)?;
        let pos = match find_intermediate(a.0, a.1, b.0, b.1) {
            Ok(pos) => pos,
            Err(FailToFindIntermediate::EqualFractions) => {
                tracing::warn!("Failed to find intermediate position: EqualFractions");
                a
            }
            Err(FailToFindIntermediate::OutOfRange) => {
                tracing::error!(
                    "Failed to find intermediate position between ({}, {}) and ({}, {}): Out of range.",
                    a.0,
                    a.1,
                    b.0,
                    b.1
                );
                return Err(ValidationFailed("Out of range position").into());
            }
        };

        let message_in_pos = sqlx::query_file_scalar!(
            "sql/messages/set_position.sql",
            id,
            channel_id,
            pos.0,
            pos.1
        )
        .fetch_optional(&mut *db)
        .await?;
        let Some(message_in_pos) = message_in_pos else {
            tracing::warn!("Message {} not found in channel {}", id, channel_id);
            return Ok(None);
        };
        if message_in_pos.id == *id {
            Ok(Some(message_in_pos))
        } else {
            let message_in_pos_id = message_in_pos.id;
            tracing::warn!(
                "Conflict occurred while moving message {id} in channel {channel_id}, same position as {message_in_pos_id}"
            );
            Message::move_bottom(
                db,
                &channel_id,
                id,
                (message_in_pos.pos_p, message_in_pos.pos_q),
            )
            .await
        }
    }
    pub async fn max_pos<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
    ) -> Result<MaxPos, sqlx::Error> {
        sqlx::query_file_as!(MaxPos, "sql/messages/max_pos.sql", channel_id)
            .fetch_one(db)
            .await
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
        entities: Entities,
        in_game: bool,
        is_action: bool,
        media_id: Option<Uuid>,
        color: String,
    ) -> Result<Option<Message>, ModelError> {
        let entities = serde_json::to_value(entities).unwrap_or(JsonValue::Array(vec![]));
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
            message.hide(None);
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

#[derive(Debug, Clone, Copy)]
pub struct MaxPos {
    pub pos_p: i32,
    pub pos_q: i32,
    pub id: Uuid,
}
