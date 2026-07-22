use chrono::prelude::*;

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::error::{AppError, ModelError, ValidationFailed};
use crate::pos::{FailToFindIntermediate, check_pos, find_intermediate};
use crate::utils::{is_false, merge_blank};
use crate::validators::CHARACTER_NAME;

pub use shared_types::messages::Entities;

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
    #[serde(default, skip_serializing_if = "is_zero")]
    pub rev: i32,
}

fn is_zero(value: &i32) -> bool {
    *value == 0
}

type MessagePositionRange = (Option<(i32, i32)>, Option<(i32, i32)>);

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
        pool: &sqlx::PgPool,
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

        let pos = crate::messages::MESSAGE_POSITIONS
            .sending_new_message(pool, channel_id, id, request_pos, preview_id)
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
        .fetch_one(pool)
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
            let new_pos = crate::messages::MESSAGE_POSITIONS
                .on_conflict(pool, channel_id, id)
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
            .fetch_one(pool)
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
                crate::messages::MESSAGE_POSITIONS.shutdown(channel_id);
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
                crate::messages::MESSAGE_POSITIONS.cancel(channel_id, id);
                return Err(err.into());
            }
        };
        crate::messages::MESSAGE_POSITIONS.submitted(
            channel_id,
            message.id,
            message.pos_p,
            message.pos_q,
            None,
        );
        message.hide(None);

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

    pub(super) async fn move_between(
        db: &sqlx::PgPool,
        user_id: Uuid,
        id: &Uuid,
        channel_id: Uuid,
        range: MessagePositionRange,
        expect_pos: Option<(i32, i32)>,
    ) -> Result<MessageMoveOutcome, ModelError> {
        let moved = match range {
            (Some(a), Some((0, _) | (1, 0)) | None) => {
                Self::move_bottom(db, user_id, channel_id, id, a, expect_pos).await?
            }
            (Some((_, 0) | (0, 1)) | None, Some(b)) => {
                Self::move_above(db, user_id, channel_id, id, b, expect_pos).await?
            }
            (Some(a), Some(b)) => {
                return Self::move_to_intermediate(db, user_id, id, channel_id, a, b, expect_pos)
                    .await;
            }
            (None, None) => {
                return Err(ValidationFailed("a and b cannot both be null").into());
            }
        };
        match moved {
            Some(moved) => Ok(finish_move(moved)),
            None => Self::diagnose_move(db, user_id, id, channel_id, expect_pos).await,
        }
    }

    async fn move_above(
        db: &sqlx::PgPool,
        user_id: Uuid,
        channel_id: Uuid,
        message_id: &Uuid,
        pos: (i32, i32),
        expect_pos: Option<(i32, i32)>,
    ) -> Result<Option<MoveRecord>, ModelError> {
        check_pos(pos)?;
        let (expect_p, expect_q) = optional_position_parts(expect_pos);
        sqlx::query_file_as!(
            MoveRecord,
            "sql/messages/move_above.sql",
            channel_id,
            message_id,
            pos.0,
            pos.1,
            user_id,
            expect_p,
            expect_q
        )
        .fetch_optional(db)
        .await
        .map_err(Into::into)
    }

    async fn move_bottom(
        db: &sqlx::PgPool,
        user_id: Uuid,
        channel_id: Uuid,
        message_id: &Uuid,
        pos: (i32, i32),
        expect_pos: Option<(i32, i32)>,
    ) -> Result<Option<MoveRecord>, ModelError> {
        check_pos(pos)?;
        let (expect_p, expect_q) = optional_position_parts(expect_pos);
        sqlx::query_file_as!(
            MoveRecord,
            "sql/messages/move_bottom.sql",
            channel_id,
            message_id,
            pos.0,
            pos.1,
            user_id,
            expect_p,
            expect_q
        )
        .fetch_optional(db)
        .await
        .map_err(Into::into)
    }

    async fn move_to_intermediate(
        db: &sqlx::PgPool,
        user_id: Uuid,
        id: &Uuid,
        channel_id: Uuid,
        a: (i32, i32),
        b: (i32, i32),
        expect_pos: Option<(i32, i32)>,
    ) -> Result<MessageMoveOutcome, ModelError> {
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

        let (expect_p, expect_q) = optional_position_parts(expect_pos);
        let result = sqlx::query_file_as!(
            MoveRecord,
            "sql/messages/set_position.sql",
            id,
            channel_id,
            pos.0,
            pos.1,
            user_id,
            expect_p,
            expect_q
        )
        .fetch_optional(db)
        .await?;
        let Some(result) = result else {
            return Self::diagnose_move(db, user_id, id, channel_id, expect_pos).await;
        };
        if result.message.id == *id {
            return Ok(finish_move(result));
        }

        // Capture current Postgres transaction id to correlate conflicts across logs.
        let txid_current = sqlx::query_scalar::<sqlx::Postgres, i64>("select txid_current()")
            .fetch_one(db)
            .await
            .ok();
        let conflicting_message = result.message;
        crate::messages::MESSAGE_POSITIONS.submitted(
            channel_id,
            conflicting_message.id,
            conflicting_message.pos_p,
            conflicting_message.pos_q,
            Some(conflicting_message.id),
        );
        tracing::warn!(
            conflict_txid = txid_current,
            attempted_pos_p = pos.0,
            attempted_pos_q = pos.1,
            lower_bound_pos_p = a.0,
            lower_bound_pos_q = a.1,
            upper_bound_pos_p = b.0,
            upper_bound_pos_q = b.1,
            conflicting_pos_p = conflicting_message.pos_p,
            conflicting_pos_q = conflicting_message.pos_q,
            conflicting_message_id = %conflicting_message.id,
            attempted_message_id = %id,
            channel_id = %channel_id,
            "Conflict occurred while moving message; falling back to move_bottom"
        );
        let moved = Self::move_bottom(
            db,
            user_id,
            channel_id,
            id,
            (conflicting_message.pos_p, conflicting_message.pos_q),
            expect_pos,
        )
        .await?;
        match moved {
            Some(moved) => Ok(finish_move(moved)),
            None => Self::diagnose_move(db, user_id, id, channel_id, expect_pos).await,
        }
    }

    async fn diagnose_move(
        db: &sqlx::PgPool,
        user_id: Uuid,
        id: &Uuid,
        channel_id: Uuid,
        expect_pos: Option<(i32, i32)>,
    ) -> Result<MessageMoveOutcome, ModelError> {
        let (expect_p, expect_q) = optional_position_parts(expect_pos);
        // UPDATE ... RETURNING cannot explain why no row matched. Keep successful moves to one
        // query, and only diagnose the zero-row case to classify the failure.
        let status = sqlx::query_file!(
            "sql/messages/get_move_status.sql",
            id,
            channel_id,
            user_id,
            expect_p,
            expect_q
        )
        .fetch_one(db)
        .await?;
        if !status.message_exists {
            return Ok(MessageMoveOutcome::MessageNotFound);
        }
        if !status.channel_matches {
            return Ok(MessageMoveOutcome::ChannelMismatch);
        }
        if !status.position_matches {
            return Ok(MessageMoveOutcome::PositionChanged);
        }
        if !status.channel_exists {
            return Ok(MessageMoveOutcome::ChannelNotFound);
        }
        if !status.can_move {
            return Ok(MessageMoveOutcome::NoPermission);
        }
        tracing::warn!(
            %id,
            %user_id,
            %channel_id,
            "Authorized message move did not update a matching row"
        );
        Ok(MessageMoveOutcome::PositionChanged)
    }

    pub(super) async fn max_pos<'c, T: sqlx::PgExecutor<'c>>(
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
    pub(super) async fn edit(
        db: &sqlx::PgPool,
        user_id: Uuid,
        name: &str,
        id: &Uuid,
        text: &str,
        entities: Entities,
        in_game: bool,
        is_action: bool,
        media_id: Option<Uuid>,
        color: String,
        expect_modified: Option<DateTime<Utc>>,
    ) -> Result<MessageEditOutcome, ModelError> {
        let entities = serde_json::to_value(entities).unwrap_or(JsonValue::Array(vec![]));
        let name = merge_blank(name);
        CHARACTER_NAME.run(&name)?;
        let result = sqlx::query_file!(
            "sql/messages/edit.sql",
            id,
            &name,
            text,
            entities,
            in_game,
            is_action,
            media_id,
            color,
            expect_modified,
            user_id
        )
        .fetch_optional(db)
        .await?;
        if let Some(record) = result {
            let mut message = record.message;
            message.hide(None);
            return Ok(MessageEditOutcome::Updated {
                message,
                space_id: record.space_id,
            });
        }

        // UPDATE ... RETURNING cannot explain why no row matched. Keep successful edits to one
        // query, and only diagnose the zero-row case to classify the failure.
        let status = sqlx::query_file!(
            "sql/messages/get_edit_status.sql",
            id,
            user_id,
            expect_modified
        )
        .fetch_one(db)
        .await?;
        if !status.message_exists {
            return Ok(MessageEditOutcome::MessageNotFound);
        }
        if !status.channel_exists {
            return Ok(MessageEditOutcome::ChannelNotFound);
        }
        if !status.can_edit {
            return Ok(MessageEditOutcome::NoPermission);
        }
        if !status.version_matches {
            return Ok(MessageEditOutcome::Conflict);
        }
        tracing::warn!(
            %id,
            %user_id,
            "Authorized message edit did not update a matching row"
        );
        Ok(MessageEditOutcome::Conflict)
    }

    pub async fn delete<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<u64, sqlx::Error> {
        sqlx::query_file!("sql/messages/delete.sql", id)
            .execute(db)
            .await
            .map(|res| res.rows_affected())
    }
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug)]
pub(super) enum MessageEditOutcome {
    Updated { message: Message, space_id: Uuid },
    MessageNotFound,
    ChannelNotFound,
    NoPermission,
    Conflict,
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug)]
pub(super) enum MessageMoveOutcome {
    Moved {
        message: Message,
        space_id: Uuid,
        old_pos: f64,
    },
    MessageNotFound,
    ChannelMismatch,
    ChannelNotFound,
    NoPermission,
    PositionChanged,
}

#[derive(Debug)]
struct MoveRecord {
    message: Message,
    space_id: Uuid,
    old_pos: f64,
}

fn optional_position_parts(pos: Option<(i32, i32)>) -> (Option<i32>, Option<i32>) {
    pos.map_or((None, None), |(p, q)| (Some(p), Some(q)))
}

fn finish_move(record: MoveRecord) -> MessageMoveOutcome {
    crate::messages::MESSAGE_POSITIONS.submitted(
        record.message.channel_id,
        record.message.id,
        record.message.pos_p,
        record.message.pos_q,
        Some(record.message.id),
    );
    MessageMoveOutcome::Moved {
        message: record.message,
        space_id: record.space_id,
        old_pos: record.old_pos,
    }
}

#[derive(Debug, Clone, Copy)]
pub(super) struct MaxPos {
    pub(super) pos_p: i32,
    pub(super) pos_q: i32,
    pub(super) id: Uuid,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::channels::{Channel, ChannelMember, ChannelType};
    use crate::spaces::{Space, SpaceMember};
    use crate::users::User;
    use shared_types::entities::{Entity as RichEntity, Span};
    use std::time::Duration;

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
        ChannelMember::add_user(pool, owner.id, channel.id, "GM", true)
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

    async fn create_position_test_message(
        pool: &sqlx::PgPool,
        channel_id: Uuid,
        space_id: Uuid,
        owner_id: &Uuid,
        text: &str,
        request_pos: Option<(i32, i32)>,
    ) -> Message {
        Message::create(
            pool,
            None,
            channel_id,
            space_id,
            owner_id,
            "GM",
            "GM",
            text,
            sample_entities(text),
            false,
            false,
            true,
            None,
            None,
            request_pos,
            "#123456".to_string(),
        )
        .await
        .expect("failed to create position test message")
    }

    fn expect_moved(outcome: MessageMoveOutcome, context: &str) -> Message {
        match outcome {
            MessageMoveOutcome::Moved { message, .. } => message,
            outcome => panic!("{context}: {outcome:?}"),
        }
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
        ChannelMember::add_user(&pool, other.id, channel.id, "Player", false)
            .await
            .expect("failed to add member to channel");
        ChannelMember::add_user(&pool, bystander.id, channel.id, "Watcher", false)
            .await
            .expect("failed to add bystander to channel");

        let text = "Hello world";
        let entities = sample_entities(text);
        let message = Message::create(
            &pool,
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
        assert_eq!(message.rev, 0);
        let pos_one = (message.pos_p, message.pos_q);

        let whisper_text = "Secret";
        let whisper_message = Message::create(
            &pool,
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
        assert_eq!(folded.modified, message.modified);
        assert_eq!(folded.rev, message.rev + 1);

        let edited_entities = sample_entities("Updated text");
        let edited = Message::edit(
            &pool,
            owner.id,
            "GM Updated",
            &message.id,
            "Updated text",
            edited_entities,
            false,
            true,
            None,
            "char:GM".to_string(),
            None,
        )
        .await
        .expect("edit failed");
        let MessageEditOutcome::Updated {
            message: edited,
            space_id,
        } = edited
        else {
            panic!("edited message missing");
        };
        assert_eq!(space_id, space.id);
        assert_eq!(edited.text, "Updated text");
        assert!(edited.is_action);
        assert_eq!(edited.rev, folded.rev + 1);
        assert!(edited.modified > folded.modified);

        let deleted = Message::delete(&pool, &message.id)
            .await
            .expect("delete failed");
        assert_eq!(deleted, 1);

        let after_delete = Message::get(&pool, &message.id, Some(&owner.id))
            .await
            .expect("get after delete failed");
        assert!(after_delete.is_none());

        let folded_after_delete = Message::set_folded(&pool, &message.id, false)
            .await
            .expect("set_folded after delete failed");
        assert!(folded_after_delete.is_none());

        let edited_after_delete = Message::edit(
            &pool,
            owner.id,
            "Deleted",
            &message.id,
            "Deleted text",
            sample_entities("Deleted text"),
            false,
            false,
            None,
            String::new(),
            None,
        )
        .await
        .expect("edit after delete failed");
        assert!(matches!(
            edited_after_delete,
            MessageEditOutcome::MessageNotFound
        ));

        let moved_after_delete = Message::move_between(
            &pool,
            owner.id,
            &message.id,
            channel.id,
            (Some((whisper_message.pos_p, whisper_message.pos_q)), None),
            None,
        )
        .await
        .expect("move after delete failed");
        assert!(matches!(
            moved_after_delete,
            MessageMoveOutcome::MessageNotFound
        ));

        crate::messages::MESSAGE_POSITIONS.shutdown(channel.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_create_with_cold_pos_state_and_single_connection(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "single_conn_owner").await;
        let space = create_test_space(&pool, &owner, "single_conn_space").await;
        let channel = create_test_channel(&pool, &space, &owner, "Single Connection").await;
        crate::messages::MESSAGE_POSITIONS.shutdown(channel.id);

        let single_connection_pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(Duration::from_secs(2))
            .connect_with(pool.connect_options().as_ref().clone())
            .await
            .expect("failed to create single-connection pool");

        let message = tokio::time::timeout(
            Duration::from_secs(5),
            Message::create(
                &single_connection_pool,
                None,
                channel.id,
                space.id,
                &owner.id,
                "GM",
                "GM",
                "Cold position message",
                sample_entities("Cold position message"),
                false,
                false,
                true,
                None,
                None,
                None,
                "#123456".to_string(),
            ),
        )
        .await
        .expect("message creation deadlocked with a single database connection")
        .expect("failed to create message through cold position state");

        assert_eq!(message.channel_id, channel.id);
        crate::messages::MESSAGE_POSITIONS.shutdown(channel.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_moves_accept_server_allocated_position_bounds(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "high_pos_owner").await;
        let space = create_test_space(&pool, &owner, "high_pos_space").await;
        let channel = create_test_channel(&pool, &space, &owner, "High Positions").await;
        let request_limit = crate::pos::MAX_REQUEST_POSITION;

        let at_limit = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &owner.id,
            "At request limit",
            Some((request_limit, 1)),
        )
        .await;
        let above_limit = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &owner.id,
            "Server allocated above limit",
            None,
        )
        .await;
        let movable = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &owner.id,
            "Movable",
            Some((request_limit - 1, 1)),
        )
        .await;

        assert_eq!((at_limit.pos_p, at_limit.pos_q), (request_limit, 1));
        assert_eq!(
            (above_limit.pos_p, above_limit.pos_q),
            (request_limit + 1, 1)
        );

        let moved_above = expect_moved(
            Message::move_between(
                &pool,
                owner.id,
                &movable.id,
                channel.id,
                (None, Some((above_limit.pos_p, above_limit.pos_q))),
                None,
            )
            .await
            .expect("move_above rejected a server-allocated position bound"),
            "move_above returned no message",
        );
        assert!(moved_above.pos > at_limit.pos && moved_above.pos < above_limit.pos);

        let moved_bottom = expect_moved(
            Message::move_between(
                &pool,
                owner.id,
                &at_limit.id,
                channel.id,
                (Some((above_limit.pos_p, above_limit.pos_q)), None),
                None,
            )
            .await
            .expect("move_bottom rejected a server-allocated position bound"),
            "move_bottom returned no message",
        );
        assert!(moved_bottom.pos > above_limit.pos);

        let moved_between = expect_moved(
            Message::move_between(
                &pool,
                owner.id,
                &moved_above.id,
                channel.id,
                (
                    Some((above_limit.pos_p, above_limit.pos_q)),
                    Some((moved_bottom.pos_p, moved_bottom.pos_q)),
                ),
                None,
            )
            .await
            .expect("move_between rejected server-allocated position bounds"),
            "move_between returned no message",
        );
        assert!(
            moved_between.pos > above_limit.pos && moved_between.pos < moved_bottom.pos,
            "moved message was not placed between its server-allocated bounds"
        );

        crate::messages::MESSAGE_POSITIONS.shutdown(channel.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_position_flow(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let space = create_test_space(&pool, &owner, "message_pos").await;
        let channel = create_test_channel(&pool, &space, &owner, "Moves").await;

        let msg1 = Message::create(
            &pool,
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
            &pool,
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
            &pool,
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

        let max_pos = Message::max_pos(&pool, &channel.id)
            .await
            .expect("max_pos failed");
        assert_eq!(max_pos.id, msg3.id);

        let moved_above = expect_moved(
            Message::move_between(
                &pool,
                owner.id,
                &msg3.id,
                channel.id,
                (None, Some((msg2.pos_p, msg2.pos_q))),
                None,
            )
            .await
            .expect("move_above errored"),
            "move_above returned none",
        );
        assert!(moved_above.pos < msg2.pos);
        assert_eq!(moved_above.rev, msg3.rev + 1);

        let moved_bottom = expect_moved(
            Message::move_between(
                &pool,
                owner.id,
                &msg1.id,
                channel.id,
                (Some((moved_above.pos_p, moved_above.pos_q)), None),
                None,
            )
            .await
            .expect("move_bottom errored"),
            "move_bottom returned none",
        );
        assert!(moved_bottom.pos > moved_above.pos);
        assert_eq!(moved_bottom.rev, msg1.rev + 1);

        let between = expect_moved(
            Message::move_between(
                &pool,
                owner.id,
                &msg2.id,
                channel.id,
                (
                    Some((moved_above.pos_p, moved_above.pos_q)),
                    Some((moved_bottom.pos_p, moved_bottom.pos_q)),
                ),
                None,
            )
            .await
            .expect("move_between errored"),
            "move_between returned none",
        );
        assert!(between.pos > moved_above.pos && between.pos < moved_bottom.pos);
        assert_eq!(between.rev, msg2.rev + 1);

        let ordered = Message::get_by_channel(&pool, &channel.id, None, 10, Some(&owner.id))
            .await
            .expect("get_by_channel after moves failed");
        assert_eq!(ordered.len(), 3);
        assert_eq!(ordered[0].id, moved_bottom.id);
        assert_eq!(ordered[1].id, between.id);
        assert_eq!(ordered[2].id, moved_above.id);

        crate::messages::MESSAGE_POSITIONS.shutdown(channel.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_move_between_requires_message_channel(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let space = create_test_space(&pool, &owner, "wrong_channel_move").await;
        let source_channel = create_test_channel(&pool, &space, &owner, "Source").await;
        let other_channel = create_test_channel(&pool, &space, &owner, "Other").await;

        let source_message = Message::create(
            &pool,
            None,
            source_channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            "Source message",
            sample_entities("Source message"),
            false,
            false,
            true,
            None,
            None,
            None,
            "#123456".to_string(),
        )
        .await
        .expect("failed to create source message");
        let other_a = Message::create(
            &pool,
            None,
            other_channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            "Other A",
            sample_entities("Other A"),
            false,
            false,
            true,
            None,
            None,
            None,
            "#123456".to_string(),
        )
        .await
        .expect("failed to create other message A");
        let other_b = Message::create(
            &pool,
            None,
            other_channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            "Other B",
            sample_entities("Other B"),
            false,
            false,
            true,
            None,
            None,
            None,
            "#123456".to_string(),
        )
        .await
        .expect("failed to create other message B");

        let moved = Message::move_between(
            &pool,
            owner.id,
            &source_message.id,
            other_channel.id,
            (
                Some((other_a.pos_p, other_a.pos_q)),
                Some((other_b.pos_p, other_b.pos_q)),
            ),
            None,
        )
        .await
        .expect("move_between errored");
        assert!(matches!(moved, MessageMoveOutcome::ChannelMismatch));

        let unchanged = Message::get(&pool, &source_message.id, Some(&owner.id))
            .await
            .expect("get source message failed")
            .expect("source message missing");
        assert_eq!(unchanged.channel_id, source_channel.id);
        assert_eq!(unchanged.pos_p, source_message.pos_p);
        assert_eq!(unchanged.pos_q, source_message.pos_q);
        assert_eq!(unchanged.rev, source_message.rev);

        crate::messages::MESSAGE_POSITIONS.shutdown(source_channel.id);
        crate::messages::MESSAGE_POSITIONS.shutdown(other_channel.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_move_authorization(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "move_owner").await;
        let member = create_test_user(&pool, "move_member").await;
        let outsider = create_test_user(&pool, "move_outsider").await;
        let space = create_test_space(&pool, &owner, "move_auth").await;
        SpaceMember::add_user(&pool, &member.id, &space.id)
            .await
            .expect("failed to add member to space");
        let channel = create_test_channel(&pool, &space, &owner, "Restricted Moves").await;
        ChannelMember::add_user(&pool, member.id, channel.id, "Player", false)
            .await
            .expect("failed to add member to channel");

        let bound = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &owner.id,
            "Move bound",
            None,
        )
        .await;
        let owner_message = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &owner.id,
            "Owner message",
            None,
        )
        .await;
        let original_owner_pos = (owner_message.pos_p, owner_message.pos_q);
        let move_above_range = (None, Some((bound.pos_p, bound.pos_q)));

        let member_outcome = Message::move_between(
            &pool,
            member.id,
            &owner_message.id,
            channel.id,
            move_above_range,
            Some(original_owner_pos),
        )
        .await
        .expect("member move attempt errored");
        assert!(matches!(member_outcome, MessageMoveOutcome::NoPermission));
        let outsider_outcome = Message::move_between(
            &pool,
            outsider.id,
            &owner_message.id,
            channel.id,
            move_above_range,
            Some(original_owner_pos),
        )
        .await
        .expect("outsider move attempt errored");
        assert!(matches!(outsider_outcome, MessageMoveOutcome::NoPermission));

        let owner_outcome = Message::move_between(
            &pool,
            owner.id,
            &owner_message.id,
            channel.id,
            move_above_range,
            Some(original_owner_pos),
        )
        .await
        .expect("sender move errored");
        let MessageMoveOutcome::Moved {
            message: moved_owner_message,
            space_id,
            old_pos,
        } = owner_outcome
        else {
            panic!("sender should be allowed to move their message");
        };
        assert_eq!(space_id, space.id);
        assert_eq!(old_pos, owner_message.pos);
        assert!(moved_owner_message.pos < bound.pos);

        let stale_outcome = Message::move_between(
            &pool,
            owner.id,
            &owner_message.id,
            channel.id,
            (Some((bound.pos_p, bound.pos_q)), None),
            Some(original_owner_pos),
        )
        .await
        .expect("stale move attempt errored");
        assert!(matches!(stale_outcome, MessageMoveOutcome::PositionChanged));

        let other_channel = create_test_channel(&pool, &space, &owner, "Other Moves").await;
        let mismatch_outcome = Message::move_between(
            &pool,
            owner.id,
            &owner_message.id,
            other_channel.id,
            move_above_range,
            None,
        )
        .await
        .expect("wrong-channel move attempt errored");
        assert!(matches!(
            mismatch_outcome,
            MessageMoveOutcome::ChannelMismatch
        ));

        let member_message = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &member.id,
            "Member message",
            None,
        )
        .await;
        let master_outcome = Message::move_between(
            &pool,
            owner.id,
            &member_message.id,
            channel.id,
            (Some((bound.pos_p, bound.pos_q)), None),
            Some((member_message.pos_p, member_message.pos_q)),
        )
        .await
        .expect("master move errored");
        assert!(matches!(master_outcome, MessageMoveOutcome::Moved { .. }));

        let document_channel = Channel::create(
            &pool,
            &space.id,
            "Document Moves",
            true,
            Some("d20"),
            ChannelType::Document,
        )
        .await
        .expect("failed to create document channel");
        let document_channel = Channel::edit(
            &pool,
            &document_channel.id,
            None,
            None,
            None,
            None,
            None,
            Some(true),
            None,
            None,
        )
        .await
        .expect("failed to enable document editing");
        ChannelMember::add_user(&pool, owner.id, document_channel.id, "GM", true)
            .await
            .expect("failed to add owner to document channel");
        ChannelMember::add_user(&pool, member.id, document_channel.id, "Player", false)
            .await
            .expect("failed to add member to document channel");
        let document_a = create_position_test_message(
            &pool,
            document_channel.id,
            space.id,
            &owner.id,
            "Document A",
            None,
        )
        .await;
        let document_b = create_position_test_message(
            &pool,
            document_channel.id,
            space.id,
            &owner.id,
            "Document B",
            None,
        )
        .await;
        let document_target = create_position_test_message(
            &pool,
            document_channel.id,
            space.id,
            &owner.id,
            "Document target",
            None,
        )
        .await;
        let document_outcome = Message::move_between(
            &pool,
            member.id,
            &document_target.id,
            document_channel.id,
            (
                Some((document_a.pos_p, document_a.pos_q)),
                Some((document_b.pos_p, document_b.pos_q)),
            ),
            Some((document_target.pos_p, document_target.pos_q)),
        )
        .await
        .expect("document member move errored");
        assert!(matches!(document_outcome, MessageMoveOutcome::Moved { .. }));

        let missing_outcome = Message::move_between(
            &pool,
            owner.id,
            &Uuid::new_v4(),
            channel.id,
            move_above_range,
            None,
        )
        .await
        .expect("missing message move attempt errored");
        assert!(matches!(
            missing_outcome,
            MessageMoveOutcome::MessageNotFound
        ));

        let unchanged = Message::get(&pool, &owner_message.id, Some(&owner.id))
            .await
            .expect("failed to reload owner message")
            .expect("owner message disappeared");
        assert_eq!(unchanged.pos, moved_owner_message.pos);

        crate::messages::MESSAGE_POSITIONS.shutdown(channel.id);
        crate::messages::MESSAGE_POSITIONS.shutdown(other_channel.id);
        crate::messages::MESSAGE_POSITIONS.shutdown(document_channel.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_concurrent_message_moves_recheck_expected_position(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "move_race_owner").await;
        let space = create_test_space(&pool, &owner, "move_race").await;
        let channel = create_test_channel(&pool, &space, &owner, "Concurrent Moves").await;
        let lower_a = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &owner.id,
            "Lower bound A",
            None,
        )
        .await;
        let lower_b = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &owner.id,
            "Lower bound B",
            None,
        )
        .await;
        let target = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &owner.id,
            "Move target",
            None,
        )
        .await;
        let upper = create_position_test_message(
            &pool,
            channel.id,
            space.id,
            &owner.id,
            "Upper bound",
            None,
        )
        .await;
        let expect_pos = Some((target.pos_p, target.pos_q));
        let race_pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(6)
            .acquire_timeout(Duration::from_secs(5))
            .connect_with(pool.connect_options().as_ref().clone())
            .await
            .expect("failed to create concurrency test pool");

        // Hold the target row so both move statements overlap while acquiring it.
        let mut blocker = race_pool.begin().await.expect("failed to begin blocker");
        let blocker_pid = sqlx::query_scalar::<_, i32>("SELECT pg_backend_pid()")
            .fetch_one(&mut *blocker)
            .await
            .expect("failed to read blocker pid");
        sqlx::query("SELECT id FROM messages WHERE id = $1 FOR UPDATE")
            .bind(target.id)
            .fetch_one(&mut *blocker)
            .await
            .expect("failed to lock target message");

        let first_pool = race_pool.clone();
        let first = tokio::spawn(async move {
            Message::move_between(
                &first_pool,
                owner.id,
                &target.id,
                channel.id,
                (None, Some((lower_a.pos_p, lower_a.pos_q))),
                expect_pos,
            )
            .await
        });
        let second_pool = race_pool.clone();
        let second = tokio::spawn(async move {
            Message::move_between(
                &second_pool,
                owner.id,
                &target.id,
                channel.id,
                (Some((upper.pos_p, upper.pos_q)), None),
                expect_pos,
            )
            .await
        });
        let third_pool = race_pool.clone();
        let third = tokio::spawn(async move {
            Message::move_between(
                &third_pool,
                owner.id,
                &target.id,
                channel.id,
                (
                    Some((lower_a.pos_p, lower_a.pos_q)),
                    Some((lower_b.pos_p, lower_b.pos_q)),
                ),
                expect_pos,
            )
            .await
        });

        let mut blocked_moves = 0;
        for _ in 0..500 {
            blocked_moves = sqlx::query_scalar::<_, i64>(
                "SELECT count(*) FROM pg_stat_activity \
                 WHERE datname = current_database() \
                 AND pid <> $1 \
                 AND cardinality(pg_blocking_pids(pid)) > 0 \
                 AND query LIKE 'WITH %UPDATE%messages msg%'",
            )
            .bind(blocker_pid)
            .fetch_one(&race_pool)
            .await
            .expect("failed to inspect blocked moves");
            if blocked_moves >= 2 {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        blocker
            .commit()
            .await
            .expect("failed to release target message");
        assert!(
            blocked_moves >= 2,
            "at least two moves should reach the locked target row"
        );

        let first_outcome = tokio::time::timeout(Duration::from_secs(5), first)
            .await
            .expect("first move timed out")
            .expect("first move task panicked")
            .expect("first move errored");
        let second_outcome = tokio::time::timeout(Duration::from_secs(5), second)
            .await
            .expect("second move timed out")
            .expect("second move task panicked")
            .expect("second move errored");
        let third_outcome = tokio::time::timeout(Duration::from_secs(5), third)
            .await
            .expect("third move timed out")
            .expect("third move task panicked")
            .expect("third move errored");
        let outcomes = [first_outcome, second_outcome, third_outcome];
        let moved_count = outcomes
            .iter()
            .filter(|outcome| matches!(outcome, MessageMoveOutcome::Moved { .. }))
            .count();
        let stale_count = outcomes
            .iter()
            .filter(|outcome| matches!(outcome, MessageMoveOutcome::PositionChanged))
            .count();
        assert_eq!(
            (moved_count, stale_count),
            (1, 2),
            "only one move may consume the expected position: {outcomes:?}"
        );

        crate::messages::MESSAGE_POSITIONS.shutdown(channel.id);
        race_pool.close().await;
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_edit_conflict(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let space = create_test_space(&pool, &owner, "message_edit_conflict").await;
        let channel = create_test_channel(&pool, &space, &owner, "Two Tabs").await;

        let text = "Original text";
        let message = Message::create(
            &pool,
            None,
            channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            text,
            sample_entities(text),
            false,
            false,
            true,
            None,
            None,
            None,
            "#abcdef".to_string(),
        )
        .await
        .expect("failed to create message");
        let stale_modified = message.modified;

        // Tab A submits first, using the `modified` it observed when it started editing.
        let edited_by_a = Message::edit(
            &pool,
            owner.id,
            "GM",
            &message.id,
            "Tab A's text",
            sample_entities("Tab A's text"),
            false,
            false,
            None,
            "#abcdef".to_string(),
            Some(stale_modified),
        )
        .await
        .expect("tab A's edit errored");
        let MessageEditOutcome::Updated {
            message: edited_by_a,
            space_id,
        } = edited_by_a
        else {
            panic!("tab A's edit should apply since expect_modified matched");
        };
        assert_eq!(space_id, space.id);
        assert_eq!(edited_by_a.text, "Tab A's text");
        assert!(edited_by_a.modified > stale_modified);

        // Tab B submits with the same now-stale `modified` it observed before A's edit landed.
        let edited_by_b = Message::edit(
            &pool,
            owner.id,
            "GM",
            &message.id,
            "Tab B's text",
            sample_entities("Tab B's text"),
            false,
            false,
            None,
            "#abcdef".to_string(),
            Some(stale_modified),
        )
        .await
        .expect("tab B's edit errored");
        assert!(
            matches!(edited_by_b, MessageEditOutcome::Conflict),
            "tab B's edit must be rejected instead of overwriting tab A's edit"
        );

        let current = Message::get(&pool, &message.id, Some(&owner.id))
            .await
            .expect("get failed")
            .expect("message should still exist");
        assert_eq!(
            current.text, "Tab A's text",
            "tab A's edit must survive tab B's stale, rejected submission"
        );

        // A client that doesn't send `expect_modified` (e.g. an older build) keeps working.
        let edited_without_precondition = Message::edit(
            &pool,
            owner.id,
            "GM",
            &message.id,
            "Tab C's text",
            sample_entities("Tab C's text"),
            false,
            false,
            None,
            "#abcdef".to_string(),
            None,
        )
        .await
        .expect("unconditional edit errored");
        let MessageEditOutcome::Updated {
            message: edited_without_precondition,
            space_id,
        } = edited_without_precondition
        else {
            panic!("unconditional edit should always apply");
        };
        assert_eq!(space_id, space.id);
        assert_eq!(edited_without_precondition.text, "Tab C's text");

        crate::messages::MESSAGE_POSITIONS.shutdown(channel.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_edit_authorization(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "edit_owner").await;
        let member = create_test_user(&pool, "edit_member").await;
        let outsider = create_test_user(&pool, "edit_outsider").await;
        let space = create_test_space(&pool, &owner, "edit_auth").await;
        SpaceMember::add_user(&pool, &member.id, &space.id)
            .await
            .expect("failed to add member to space");
        let channel = create_test_channel(&pool, &space, &owner, "Owner Only Editing").await;
        ChannelMember::add_user(&pool, member.id, channel.id, "Player", false)
            .await
            .expect("failed to add member to channel");
        let message = Message::create(
            &pool,
            None,
            channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            "Owner's text",
            sample_entities("Owner's text"),
            false,
            false,
            true,
            None,
            None,
            None,
            "#abcdef".to_string(),
        )
        .await
        .expect("failed to create message");

        let edit_as = |user_id| {
            Message::edit(
                &pool,
                user_id,
                "Player",
                &message.id,
                "Unauthorized edit",
                sample_entities("Unauthorized edit"),
                false,
                false,
                None,
                "#abcdef".to_string(),
                None,
            )
        };
        let member_outcome = edit_as(member.id)
            .await
            .expect("member edit attempt errored");
        assert!(matches!(member_outcome, MessageEditOutcome::NoPermission));
        let outsider_outcome = edit_as(outsider.id)
            .await
            .expect("outsider edit attempt errored");
        assert!(matches!(outsider_outcome, MessageEditOutcome::NoPermission));

        let document_channel = Channel::create(
            &pool,
            &space.id,
            "Shared Document",
            true,
            Some("d20"),
            ChannelType::Document,
        )
        .await
        .expect("failed to create document channel");
        let document_channel = Channel::edit(
            &pool,
            &document_channel.id,
            None,
            None,
            None,
            None,
            None,
            Some(true),
            None,
            None,
        )
        .await
        .expect("failed to enable document editing");
        ChannelMember::add_user(&pool, owner.id, document_channel.id, "GM", true)
            .await
            .expect("failed to add owner to document channel");
        ChannelMember::add_user(&pool, member.id, document_channel.id, "Player", false)
            .await
            .expect("failed to add member to document channel");
        let document_message = Message::create(
            &pool,
            None,
            document_channel.id,
            space.id,
            &owner.id,
            "GM",
            "GM",
            "Shared text",
            sample_entities("Shared text"),
            false,
            false,
            true,
            None,
            None,
            None,
            "#abcdef".to_string(),
        )
        .await
        .expect("failed to create document message");
        let document_outcome = Message::edit(
            &pool,
            member.id,
            "Player",
            &document_message.id,
            "Member edit",
            sample_entities("Member edit"),
            false,
            false,
            None,
            "#abcdef".to_string(),
            None,
        )
        .await
        .expect("document member edit errored");
        assert!(matches!(
            document_outcome,
            MessageEditOutcome::Updated { .. }
        ));

        let missing_outcome = Message::edit(
            &pool,
            owner.id,
            "GM",
            &Uuid::new_v4(),
            "Missing",
            sample_entities("Missing"),
            false,
            false,
            None,
            "#abcdef".to_string(),
            None,
        )
        .await
        .expect("missing message edit attempt errored");
        assert!(matches!(
            missing_outcome,
            MessageEditOutcome::MessageNotFound
        ));

        let current = Message::get(&pool, &message.id, Some(&owner.id))
            .await
            .expect("failed to reload message")
            .expect("message disappeared");
        assert_eq!(current.text, "Owner's text");

        crate::messages::MESSAGE_POSITIONS.shutdown(channel.id);
        crate::messages::MESSAGE_POSITIONS.shutdown(document_channel.id);
    }
}
