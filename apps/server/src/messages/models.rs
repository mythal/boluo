use chrono::prelude::*;
use num_rational::Rational32;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use types::legacy::LegacyEntity;
use uuid::Uuid;

use crate::error::{AppError, ModelError, ValidationFailed};
use crate::events::context::WAIT_SHORTLY;
use crate::pos::{check_pos, find_intermediate, CHANNEL_POS_MAP};
use crate::utils::merge_blank;
use crate::validators::CHARACTER_NAME;

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
                log::error!("Invalid JSONB format");
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
                    log::error!("Failed to decode JSONB: {}", err);
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
        if !(1..=256).contains(&limit) {
            return Err(ValidationFailed("illegal limit range").into());
        }
        let mut messages =
            sqlx::query_file_scalar!("sql/messages/get_by_channel.sql", channel_id, before, limit)
                .fetch_all(db)
                .await?;
        for message in messages.iter_mut() {
            message.hide(current_user_id);
        }
        Ok(messages)
    }

    pub async fn export<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
        _hide: bool,
        after: Option<DateTime<Utc>>,
    ) -> Result<Vec<Message>, sqlx::Error> {
        // TODO: chunk
        sqlx::query_file_scalar!("sql/messages/export.sql", channel_id, after)
            .fetch_all(db)
            .await
    }

    pub async fn create(
        conn: &mut sqlx::PgConnection,
        preview_id: Option<&Uuid>,
        channel_id: &Uuid,
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
        let pos: Option<(i32, i32)> = {
            match (request_pos, preview_id) {
                (Some(pos @ (p, q)), _) => {
                    let channel_pos_map = CHANNEL_POS_MAP.0.pin();
                    let channel_pos_lock =
                        channel_pos_map.get_or_insert_with(*channel_id, Default::default);
                    let channel_pos = channel_pos_lock.read();
                    let pos_item = channel_pos.get(&Rational32::new(p, q));
                    let now = std::time::Instant::now();

                    match (pos_item, preview_id.cloned()) {
                        (Some(pos_item), Some(preview_id)) => {
                            if (preview_id == pos_item.id && pos_item.is_live())
                                || pos_item.pos_avaliable(now)
                            {
                                Some(pos)
                            } else {
                                None
                            }
                        }
                        (Some(pos_item), None) => {
                            if pos_item.pos_avaliable(now) {
                                Some(pos)
                            } else {
                                None
                            }
                        }
                        (None, _) => Some(pos),
                    }
                }
                (None, Some(id)) => CHANNEL_POS_MAP
                    .try_restore_pos(*channel_id, *id)
                    .map(|ratio| (*ratio.numer(), *ratio.denom())),
                (None, None) => None,
            }
        };
        let pos = if let Some(pos) = pos {
            pos
        } else {
            (
                CHANNEL_POS_MAP
                    .get_next_pos(&mut *conn, *channel_id)
                    .await?,
                1,
            )
        };
        check_pos(pos)?;

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
            let p = CHANNEL_POS_MAP
                .get_next_pos(&mut *conn, *channel_id)
                .await?;
            let q = 1i32;
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
                p,
                q,
                color
            )
            .fetch_one(&mut *conn)
            .await;
        }

        let mut message = row?;
        crate::pos::CHANNEL_POS_MAP.submitted(
            *channel_id,
            message.id,
            message.pos_p,
            message.pos_q,
            preview_id.cloned(),
        );
        message.hide(None);

        let created = message.created.clone();
        let channel_id = *channel_id;
        tokio::spawn(async move {
            if let Some(mut update_map) =
                super::tasks::RECENTLY_UPDATED_SPACES.try_lock_for(WAIT_SHORTLY)
            {
                update_map.insert(channel_id, created);
            }
        });
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
        let pos = if a == b {
            a
        } else {
            find_intermediate(a.0, a.1, b.0, b.1)
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
            log::warn!("Message {} not found in channel {}", id, channel_id);
            return Ok(None);
        };
        if message_in_pos.id == *id {
            Ok(Some(message_in_pos))
        } else {
            let message_in_pos_id = message_in_pos.id;
            log::warn!("Conflict occurred while moving message {id} in channel {channel_id}, same position as {message_in_pos_id}");
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
    ) -> Result<(i32, i32, Uuid), sqlx::Error> {
        sqlx::query_file!("sql/messages/max_pos.sql", channel_id)
            .fetch_one(db)
            .await
            .map(|row| (row.pos_p, row.pos_q, row.id))
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
