use chrono::prelude::*;

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use shared_types::legacy::LegacyEntity;
use uuid::Uuid;

use crate::error::{AppError, ModelError, ValidationFailed};
use crate::pos::{CHANNEL_POS_MANAGER, FailToFindIntermediate, check_pos, find_intermediate};
use crate::utils::{is_false, merge_blank};
use crate::validators::CHARACTER_NAME;

use crate::notify;

#[derive(Debug, Serialize, Deserialize, Clone, Default, specta::Type)]
pub struct Entities(pub Vec<shared_types::entities::Entity>);

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

    pub async fn get_after_pos<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        channel_id: &Uuid,
        after: Option<f64>,
        limit: i64,
        current_user_id: Option<&Uuid>,
    ) -> Result<Vec<Message>, ModelError> {
        use futures::TryStreamExt as _;
        if !(1..=256).contains(&limit) {
            return Err(ValidationFailed("illegal limit range").into());
        }
        let mut stream =
            sqlx::query_file_scalar!("sql/messages/get_after_pos.sql", channel_id, after, limit)
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
                CHANNEL_POS_MANAGER.shutdown(channel_id);
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
                crate::pos::CHANNEL_POS_MANAGER.cancel(channel_id, id);
                return Err(err.into());
            }
        };
        crate::pos::CHANNEL_POS_MANAGER.submitted(
            channel_id,
            message.id,
            message.pos_p,
            message.pos_q,
            None,
        );
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

    pub async fn move_above(
        db: &mut sqlx::PgConnection,
        channel_id: &Uuid,
        message_id: &Uuid,
        pos: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        check_pos(pos)?;

        let moved_message = sqlx::query_file_scalar!(
            "sql/messages/move_above.sql",
            channel_id,
            message_id,
            pos.0,
            pos.1
        )
        .fetch_optional(db)
        .await?;
        if let Some(moved_message) = moved_message {
            crate::pos::CHANNEL_POS_MANAGER.submitted(
                moved_message.channel_id,
                moved_message.id,
                moved_message.pos_p,
                moved_message.pos_q,
                Some(moved_message.id),
            );
            Ok(Some(moved_message))
        } else {
            Ok(None)
        }
    }

    pub async fn move_bottom(
        db: &mut sqlx::PgConnection,
        channel_id: &Uuid,
        message_id: &Uuid,
        pos: (i32, i32),
    ) -> Result<Option<Message>, ModelError> {
        check_pos(pos)?;
        let moved_message = sqlx::query_file_scalar!(
            "sql/messages/move_bottom.sql",
            channel_id,
            message_id,
            pos.0,
            pos.1
        )
        .fetch_optional(db)
        .await?;
        if let Some(moved_message) = moved_message {
            crate::pos::CHANNEL_POS_MANAGER.submitted(
                moved_message.channel_id,
                moved_message.id,
                moved_message.pos_p,
                moved_message.pos_q,
                Some(moved_message.id),
            );
            Ok(Some(moved_message))
        } else {
            Ok(None)
        }
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
        let find_intermediate_task =
            tokio::task::spawn_blocking(move || find_intermediate(a.0, a.1, b.0, b.1));
        let find_intermediate_task_with_timeout =
            tokio::time::timeout(std::time::Duration::from_secs(8), find_intermediate_task);
        let pos = match find_intermediate_task_with_timeout
            .await
            .map_err(|_| {
                tracing::error!(a = ?a, b = ?b, ?id, ?channel_id, "Timeout when finding position");
                ModelError::Unexpected(anyhow::anyhow!("Timeout when finding position"))
            })?
            .map_err(|e| ModelError::Unexpected(e.into()))?
        {
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
            crate::pos::CHANNEL_POS_MANAGER.submitted(
                message_in_pos.channel_id,
                message_in_pos.id,
                message_in_pos.pos_p,
                message_in_pos.pos_q,
                Some(message_in_pos.id),
            );
            Ok(Some(message_in_pos))
        } else {
            // Capture current Postgres transaction id to correlate conflicts across logs.
            let txid_current = sqlx::query_scalar::<sqlx::Postgres, i64>("select txid_current()")
                .fetch_one(&mut *db)
                .await
                .ok();
            crate::pos::CHANNEL_POS_MANAGER.cancel(channel_id, *id);
            let message_in_pos_id = message_in_pos.id;
            crate::pos::CHANNEL_POS_MANAGER.submitted(
                channel_id,
                message_in_pos_id,
                message_in_pos.pos_p,
                message_in_pos.pos_q,
                Some(message_in_pos.id),
            );
            tracing::warn!(
                conflict_txid = txid_current,
                attempted_pos_p = pos.0,
                attempted_pos_q = pos.1,
                lower_bound_pos_p = a.0,
                lower_bound_pos_q = a.1,
                upper_bound_pos_p = b.0,
                upper_bound_pos_q = b.1,
                conflicting_pos_p = message_in_pos.pos_p,
                conflicting_pos_q = message_in_pos.pos_q,
                conflicting_message_id = %message_in_pos_id,
                attempted_message_id = %id,
                channel_id = %channel_id,
                "Conflict occurred while moving message; falling back to move_bottom"
            );
            let moved_message = Message::move_bottom(
                db,
                &channel_id,
                id,
                (message_in_pos.pos_p, message_in_pos.pos_q),
            )
            .await?;
            if let Some(moved_message) = moved_message {
                crate::pos::CHANNEL_POS_MANAGER.submitted(
                    channel_id,
                    moved_message.id,
                    moved_message.pos_p,
                    moved_message.pos_q,
                    Some(moved_message.id),
                );
                Ok(Some(moved_message))
            } else {
                Ok(None)
            }
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::channels::{Channel, ChannelMember, ChannelType};
    use crate::spaces::{Space, SpaceMember};
    use crate::users::User;
    use shared_types::entities::{Entity as RichEntity, Span};

    fn unique_name(prefix: &str) -> String {
        let raw = Uuid::new_v4().simple().to_string();
        format!("{prefix}_{}", &raw[..6])
    }

    async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> User {
        let raw = Uuid::new_v4().simple().to_string();
        let username = format!("{prefix}_usr_{}", &raw[..6]);
        let email = format!("{prefix}_{raw}@example.com");
        User::register(pool, &email, &username, "Message Tester", "MessagePass123!")
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
            .expect("failed to grant owner admin");
        space
    }

    async fn create_test_channel(
        pool: &sqlx::PgPool,
        space: &Space,
        owner: &User,
        name: &str,
    ) -> Channel {
        let channel = Channel::create(
            pool,
            &space.id,
            name,
            true,
            Some("d20"),
            ChannelType::InGame,
        )
        .await
        .expect("failed to create channel");
        ChannelMember::add_user(pool, owner.id, channel.id, space.id, "GM", true)
            .await
            .expect("failed to add owner to channel");
        channel
    }

    fn sample_entities(text: &str) -> Entities {
        let span = Span {
            start: 0,
            len: text.chars().count() as i32,
        };
        Entities(vec![RichEntity::Text(span)])
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_create_and_fetch_flow(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let other = create_test_user(&pool, "member").await;
        let bystander = create_test_user(&pool, "bystander").await;
        let space = create_test_space(&pool, &owner, "message_space").await;
        SpaceMember::add_user(&pool, &other.id, &space.id)
            .await
            .expect("failed to add member to space");
        SpaceMember::add_user(&pool, &bystander.id, &space.id)
            .await
            .expect("failed to add bystander to space");
        let channel = create_test_channel(&pool, &space, &owner, "Story Time").await;
        ChannelMember::add_user(&pool, other.id, channel.id, space.id, "Player", false)
            .await
            .expect("failed to add member to channel");
        ChannelMember::add_user(&pool, bystander.id, channel.id, space.id, "Watcher", false)
            .await
            .expect("failed to add bystander to channel");

        let mut conn = pool.acquire().await.expect("failed to acquire connection");
        let text = "Hello world";
        let entities = sample_entities(text);
        let message = Message::create(
            &mut conn,
            None,
            channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            text,
            entities.clone(),
            true,
            false,
            true,
            None,
            None,
            None,
            "#abcdef".to_string(),
        )
        .await
        .expect("failed to create message");
        assert_eq!(message.channel_id, channel.id);
        assert_eq!(message.sender_id, owner.id);
        assert_eq!(message.text, text);
        let pos_one = (message.pos_p, message.pos_q);
        drop(conn);

        let mut conn = pool.acquire().await.expect("failed to acquire connection");
        let whisper_text = "Secret";
        let whisper_message = Message::create(
            &mut conn,
            None,
            channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            whisper_text,
            sample_entities(whisper_text),
            false,
            false,
            true,
            Some(vec![other.id]),
            None,
            None,
            "preset:orange".to_string(),
        )
        .await
        .expect("failed to create whisper message");
        assert!(whisper_message.text.is_empty());
        drop(conn);

        let fetched = Message::get(&pool, &message.id, Some(&owner.id))
            .await
            .expect("get failed")
            .expect("message not found");
        assert_eq!(fetched.text, text);

        let fetched_master = Message::get(&pool, &whisper_message.id, Some(&owner.id))
            .await
            .expect("get whisper failed")
            .expect("whisper message missing for master");
        assert_eq!(fetched_master.text, whisper_text);

        let fetched_hidden = Message::get(&pool, &whisper_message.id, Some(&bystander.id))
            .await
            .expect("get whisper for bystander failed")
            .expect("whisper message missing for bystander");
        assert!(fetched_hidden.text.is_empty());

        let fetched_visible = Message::get(&pool, &whisper_message.id, Some(&other.id))
            .await
            .expect("get whisper for member failed")
            .expect("whisper message missing for member");
        assert_eq!(fetched_visible.text, whisper_text);

        let channel_messages_for_owner =
            Message::get_by_channel(&pool, &channel.id, None, 10, Some(&owner.id))
                .await
                .expect("get_by_channel for owner failed");
        assert_eq!(channel_messages_for_owner.len(), 2);
        assert!(
            channel_messages_for_owner
                .iter()
                .any(|msg| msg.id == message.id && msg.text == text)
        );
        assert!(
            channel_messages_for_owner
                .iter()
                .any(|msg| msg.id == whisper_message.id && msg.text.is_empty())
        );

        let channel_messages_for_member =
            Message::get_by_channel(&pool, &channel.id, None, 10, Some(&other.id))
                .await
                .expect("get_by_channel for member failed");
        assert!(
            channel_messages_for_member
                .iter()
                .any(|msg| msg.id == whisper_message.id && msg.text == whisper_text)
        );

        let channel_messages_for_bystander =
            Message::get_by_channel(&pool, &channel.id, None, 10, Some(&bystander.id))
                .await
                .expect("get_by_channel for bystander failed");
        assert!(
            channel_messages_for_bystander
                .iter()
                .any(|msg| msg.id == whisper_message.id && msg.text.is_empty())
        );

        let pos_lookup = Message::query_by_pos(&pool, &channel.id, pos_one)
            .await
            .expect("query_by_pos failed")
            .expect("message not found by position");
        assert_eq!(pos_lookup.id, message.id);

        let exported = Message::export(&pool, &channel.id, false, None)
            .await
            .expect("export failed");
        assert_eq!(exported.len(), 2);

        let folded = Message::set_folded(&pool, &message.id, true)
            .await
            .expect("set_folded failed")
            .expect("message should exist");
        assert!(folded.folded);

        let edited_entities = sample_entities("Updated text");
        let edited = Message::edit(
            &pool,
            "GM Updated",
            &message.id,
            "Updated text",
            edited_entities,
            false,
            true,
            None,
            "char:GM".to_string(),
        )
        .await
        .expect("edit failed")
        .expect("edited message missing");
        assert_eq!(edited.text, "Updated text");
        assert!(edited.is_action);

        let deleted = Message::delete(&pool, &message.id)
            .await
            .expect("delete failed");
        assert_eq!(deleted, 1);

        let after_delete = Message::get(&pool, &message.id, Some(&owner.id))
            .await
            .expect("get after delete failed");
        assert!(after_delete.is_none());

        crate::pos::CHANNEL_POS_MANAGER.shutdown(channel.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_position_flow(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let space = create_test_space(&pool, &owner, "message_pos").await;
        let channel = create_test_channel(&pool, &space, &owner, "Moves").await;

        let mut conn = pool.acquire().await.expect("failed to acquire connection");
        let msg1 = Message::create(
            &mut conn,
            None,
            channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            "Message A",
            sample_entities("Message A"),
            false,
            false,
            true,
            None,
            None,
            None,
            "#123456".to_string(),
        )
        .await
        .expect("failed to create message 1");
        let msg2 = Message::create(
            &mut conn,
            None,
            channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            "Message B",
            sample_entities("Message B"),
            false,
            false,
            true,
            None,
            None,
            None,
            "#123456".to_string(),
        )
        .await
        .expect("failed to create message 2");
        let msg3 = Message::create(
            &mut conn,
            None,
            channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            "Message C",
            sample_entities("Message C"),
            false,
            false,
            true,
            None,
            None,
            None,
            "#123456".to_string(),
        )
        .await
        .expect("failed to create message 3");
        drop(conn);

        let max_pos = Message::max_pos(&pool, &channel.id)
            .await
            .expect("max_pos failed");
        assert_eq!(max_pos.id, msg3.id);

        let mut conn = pool.acquire().await.expect("failed to acquire connection");
        let moved_above =
            Message::move_above(&mut conn, &channel.id, &msg3.id, (msg2.pos_p, msg2.pos_q))
                .await
                .expect("move_above errored")
                .expect("move_above returned none");
        assert!(moved_above.pos < msg2.pos);

        let moved_bottom = Message::move_bottom(
            &mut conn,
            &channel.id,
            &msg1.id,
            (moved_above.pos_p, moved_above.pos_q),
        )
        .await
        .expect("move_bottom errored")
        .expect("move_bottom returned none");
        assert!(moved_bottom.pos > moved_above.pos);

        let between = Message::move_between(
            &mut conn,
            &msg2.id,
            channel.id,
            (moved_above.pos_p, moved_above.pos_q),
            (moved_bottom.pos_p, moved_bottom.pos_q),
        )
        .await
        .expect("move_between errored")
        .expect("move_between returned none");
        assert!(between.pos > moved_above.pos && between.pos < moved_bottom.pos);
        drop(conn);

        let ordered = Message::get_by_channel(&pool, &channel.id, None, 10, Some(&owner.id))
            .await
            .expect("get_by_channel after moves failed");
        assert_eq!(ordered.len(), 3);
        assert_eq!(ordered[0].id, moved_bottom.id);
        assert_eq!(ordered[1].id, between.id);
        assert_eq!(ordered[2].id, moved_above.id);

        crate::pos::CHANNEL_POS_MANAGER.shutdown(channel.id);
    }
}
