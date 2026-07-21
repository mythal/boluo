//! Persistent Telegram group ↔ Boluo space bindings and their delivery state.

use std::{path::Path, time::Duration};

use anyhow::{Context, Result, bail};
use sqlx::SqlitePool;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use uuid::Uuid;

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

#[derive(Clone)]
pub struct Store {
    pool: SqlitePool,
    boluo_base_url: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Binding {
    pub id: i64,
    pub space_id: Uuid,
    pub tg_chat_id: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TopicRef {
    pub tg_chat_id: i64,
    pub message_thread_id: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MappedTopic {
    pub channel_id: Uuid,
    pub topic: TopicRef,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EventCursor {
    pub timestamp: i64,
    pub node: u16,
    pub seq: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MappedMessage {
    pub boluo_message_id: Uuid,
    /// Kept so a later edit can preserve the attachment.
    pub boluo_media_id: Option<Uuid>,
}

impl Store {
    pub async fn open(path: impl AsRef<Path>, boluo_base_url: &str) -> Result<Self> {
        let path = path.as_ref();
        if let Some(parent) = path.parent()
            && !parent.as_os_str().is_empty()
        {
            std::fs::create_dir_all(parent).with_context(|| {
                format!("failed to create sqlite directory {}", parent.display())
            })?;
        }
        let options = SqliteConnectOptions::new()
            .filename(path)
            .create_if_missing(true)
            .foreign_keys(true)
            .journal_mode(SqliteJournalMode::Wal)
            .synchronous(SqliteSynchronous::Normal)
            .busy_timeout(Duration::from_secs(10))
            .optimize_on_close(true, None);
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .with_context(|| format!("failed to open sqlite database {}", path.display()))?;

        MIGRATOR
            .run(&pool)
            .await
            .context("failed to initialize bridge database schema")?;

        Ok(Store {
            pool,
            boluo_base_url: boluo_base_url.to_string(),
        })
    }

    pub async fn bindings(&self) -> Result<Vec<Binding>> {
        sqlx::query_file!("sql/bindings.sql", self.boluo_base_url)
            .fetch_all(&self.pool)
            .await?
            .into_iter()
            .map(|row| binding_from_fields(row.id, row.boluo_space_id, row.tg_chat_id))
            .collect()
    }

    /// Bind a Telegram group to a space. Rebinding the group replaces its old
    /// binding and cascades away topic mappings and the event cursor.
    pub async fn bind(&self, tg_chat_id: i64, space_id: Uuid) -> Result<Binding> {
        let mut tx = self.pool.begin().await?;
        if let Some(existing) = sqlx::query_file!(
            "sql/find_binding_by_chat.sql",
            self.boluo_base_url,
            tg_chat_id
        )
        .fetch_optional(&mut *tx)
        .await?
        {
            let existing =
                binding_from_fields(existing.id, existing.boluo_space_id, existing.tg_chat_id)?;
            if existing.space_id == space_id {
                sqlx::query_file!("sql/resume_binding.sql", existing.id, unix_timestamp_ms())
                    .execute(&mut *tx)
                    .await?;
                tx.commit().await?;
                return Ok(existing);
            }
            sqlx::query_file!("sql/delete_binding.sql", existing.id)
                .execute(&mut *tx)
                .await?;
        }

        let now_ms = unix_timestamp_ms();
        let id = sqlx::query_file_scalar!(
            "sql/insert_binding.sql",
            self.boluo_base_url,
            space_id.to_string(),
            tg_chat_id,
            now_ms,
        )
        .fetch_one(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(Binding {
            id,
            space_id,
            tg_chat_id,
        })
    }

    pub async fn binding_for_space(&self, space_id: Uuid) -> Result<Option<Binding>> {
        let row = sqlx::query_file!(
            "sql/find_binding_by_space.sql",
            self.boluo_base_url,
            space_id.to_string(),
        )
        .fetch_optional(&self.pool)
        .await?;
        row.map(|row| binding_from_fields(row.id, row.boluo_space_id, row.tg_chat_id))
            .transpose()
    }

    pub async fn unbind(&self, tg_chat_id: i64) -> Result<Option<Binding>> {
        let mut tx = self.pool.begin().await?;
        let row = sqlx::query_file!(
            "sql/find_binding_by_chat.sql",
            self.boluo_base_url,
            tg_chat_id,
        )
        .fetch_optional(&mut *tx)
        .await?;
        let Some(row) = row else {
            tx.commit().await?;
            return Ok(None);
        };
        let binding = binding_from_fields(row.id, row.boluo_space_id, row.tg_chat_id)?;
        sqlx::query_file!("sql/delete_binding.sql", binding.id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok(Some(binding))
    }

    pub async fn pause_binding(&self, binding_id: i64, reason: &str) -> Result<()> {
        sqlx::query_file!(
            "sql/pause_binding.sql",
            binding_id,
            reason,
            unix_timestamp_ms(),
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_topic(&self, binding: Binding, channel_id: Uuid) -> Result<Option<TopicRef>> {
        let row = sqlx::query_file!("sql/get_topic.sql", binding.id, channel_id.to_string())
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(|row| TopicRef {
            tg_chat_id: binding.tg_chat_id,
            message_thread_id: row.message_thread_id as i32,
        }))
    }

    pub async fn channel_for_topic(
        &self,
        tg_chat_id: i64,
        message_thread_id: i32,
    ) -> Result<Option<(Binding, Uuid)>> {
        let row = sqlx::query_file!(
            "sql/channel_for_topic.sql",
            self.boluo_base_url,
            tg_chat_id,
            message_thread_id,
        )
        .fetch_optional(&self.pool)
        .await?;
        row.map(|row| {
            let binding = binding_from_fields(row.id, row.boluo_space_id, row.tg_chat_id)?;
            let channel_id = Uuid::parse_str(&row.channel_id)?;
            Ok((binding, channel_id))
        })
        .transpose()
    }

    pub async fn insert_topic(
        &self,
        binding: Binding,
        channel_id: Uuid,
        topic: TopicRef,
        created_at_ms: i64,
    ) -> Result<()> {
        if topic.tg_chat_id != binding.tg_chat_id {
            bail!(
                "topic belongs to Telegram chat {}, but binding uses {}",
                topic.tg_chat_id,
                binding.tg_chat_id
            );
        }
        sqlx::query_file!(
            "sql/upsert_topic.sql",
            binding.id,
            channel_id.to_string(),
            topic.message_thread_id,
            created_at_ms,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn topics(&self, binding: Binding) -> Result<Vec<MappedTopic>> {
        sqlx::query_file!("sql/topics_for_binding.sql", binding.id)
            .fetch_all(&self.pool)
            .await?
            .into_iter()
            .map(|row| {
                Ok(MappedTopic {
                    channel_id: Uuid::parse_str(&row.channel_id)?,
                    topic: TopicRef {
                        tg_chat_id: binding.tg_chat_id,
                        message_thread_id: row.message_thread_id as i32,
                    },
                })
            })
            .collect()
    }

    pub async fn delete_topic(&self, binding_id: i64, channel_id: Uuid) -> Result<()> {
        sqlx::query_file!("sql/delete_topic.sql", binding_id, channel_id.to_string())
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Records which Telegram message mirrors a Boluo message. `tg_is_media`
    /// marks a photo/document send, whose caption (not text) is edited later.
    pub async fn record_message(
        &self,
        binding_id: i64,
        boluo_message_id: Uuid,
        tg_message_id: i32,
        tg_is_media: bool,
        boluo_media_id: Option<Uuid>,
    ) -> Result<()> {
        sqlx::query_file!(
            "sql/insert_message_map.sql",
            binding_id,
            boluo_message_id.to_string(),
            tg_message_id,
            tg_is_media,
            boluo_media_id.map(|id| id.to_string()),
            unix_timestamp_ms(),
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn boluo_message_by_tg(
        &self,
        binding_id: i64,
        tg_message_id: i32,
    ) -> Result<Option<MappedMessage>> {
        let row = sqlx::query_file!("sql/boluo_message_by_tg.sql", binding_id, tg_message_id)
            .fetch_optional(&self.pool)
            .await?;
        row.map(|row| -> Result<MappedMessage> {
            Ok(MappedMessage {
                boluo_message_id: Uuid::parse_str(&row.boluo_message_id)?,
                boluo_media_id: row
                    .boluo_media_id
                    .map(|id| Uuid::parse_str(&id))
                    .transpose()?,
            })
        })
        .transpose()
    }

    /// Returns the mirrored Telegram message id and whether it was sent as media.
    pub async fn tg_message_by_boluo(
        &self,
        binding_id: i64,
        boluo_message_id: Uuid,
    ) -> Result<Option<(i32, bool)>> {
        let row = sqlx::query_file!(
            "sql/tg_message_by_boluo.sql",
            binding_id,
            boluo_message_id.to_string(),
        )
        .fetch_optional(&self.pool)
        .await?;
        row.map(|row| -> Result<(i32, bool)> {
            Ok((i32::try_from(row.tg_message_id)?, row.tg_is_media != 0))
        })
        .transpose()
    }

    pub async fn delete_message_map(&self, binding_id: i64, boluo_message_id: Uuid) -> Result<()> {
        sqlx::query_file!(
            "sql/delete_message_map.sql",
            binding_id,
            boluo_message_id.to_string(),
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn event_cursor(&self, binding_id: i64) -> Result<Option<EventCursor>> {
        let row = sqlx::query_file!("sql/event_cursor.sql", binding_id)
            .fetch_optional(&self.pool)
            .await?;
        row.map(|row| -> Result<EventCursor> {
            Ok(EventCursor {
                timestamp: row.timestamp,
                node: u16::try_from(row.node)?,
                seq: u32::try_from(row.seq)?,
            })
        })
        .transpose()
    }

    pub async fn set_event_cursor(&self, binding_id: i64, cursor: EventCursor) -> Result<()> {
        sqlx::query_file!(
            "sql/upsert_cursor.sql",
            binding_id,
            cursor.timestamp,
            i64::from(cursor.node),
            i64::from(cursor.seq),
            unix_timestamp_ms(),
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn clear_event_cursor(&self, binding_id: i64) -> Result<()> {
        sqlx::query_file!("sql/clear_cursor.sql", binding_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

fn binding_from_fields(id: i64, boluo_space_id: String, tg_chat_id: i64) -> Result<Binding> {
    Ok(Binding {
        id,
        space_id: Uuid::parse_str(&boluo_space_id)?,
        tg_chat_id,
    })
}

fn unix_timestamp_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db_path() -> String {
        std::env::temp_dir()
            .join(format!("boluo-bridge-test-{}.sqlite", Uuid::new_v4()))
            .to_string_lossy()
            .into_owned()
    }

    #[tokio::test]
    async fn bindings_and_cursor_survive_reopening() {
        let path = temp_db_path();
        let space_id = Uuid::new_v4();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();
        let binding = store.bind(-1001, space_id).await.unwrap();
        let cursor = EventCursor {
            timestamp: 1_725_000_000_123,
            node: 42,
            seq: 7,
        };
        store.set_event_cursor(binding.id, cursor).await.unwrap();
        store.pool.close().await;

        let reopened = Store::open(&path, "https://boluo.example").await.unwrap();
        assert_eq!(reopened.bindings().await.unwrap(), vec![binding]);
        assert_eq!(
            reopened.event_cursor(binding.id).await.unwrap(),
            Some(cursor)
        );
        reopened.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn enables_safe_connection_defaults() {
        let path = temp_db_path();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();

        let journal_mode = sqlx::query_file_scalar!("sql/journal_mode.sql")
            .fetch_one(&store.pool)
            .await
            .unwrap();
        let foreign_keys = sqlx::query_file_scalar!("sql/foreign_keys.sql")
            .fetch_one(&store.pool)
            .await
            .unwrap();
        let synchronous = sqlx::query_file_scalar!("sql/synchronous.sql")
            .fetch_one(&store.pool)
            .await
            .unwrap();
        let strict_table_count = sqlx::query_file_scalar!("sql/strict_table_count.sql")
            .fetch_one(&store.pool)
            .await
            .unwrap();
        assert_eq!(journal_mode.as_deref(), Some("wal"));
        assert_eq!(foreign_keys, Some(1));
        assert_eq!(synchronous, Some(1));
        assert_eq!(strict_table_count, 4);

        store.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn rebinding_a_group_clears_old_state() {
        let path = temp_db_path();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();
        let old = store.bind(-1001, Uuid::new_v4()).await.unwrap();
        let channel_id = Uuid::new_v4();
        store
            .insert_topic(
                old,
                channel_id,
                TopicRef {
                    tg_chat_id: -1001,
                    message_thread_id: 10,
                },
                1,
            )
            .await
            .unwrap();
        store
            .set_event_cursor(
                old.id,
                EventCursor {
                    timestamp: 100,
                    node: 1,
                    seq: 2,
                },
            )
            .await
            .unwrap();

        let new = store.bind(-1001, Uuid::new_v4()).await.unwrap();
        assert_ne!(new.id, old.id);
        assert_eq!(store.event_cursor(new.id).await.unwrap(), None);
        assert_eq!(store.channel_for_topic(-1001, 10).await.unwrap(), None);

        store.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn stores_multiple_bindings() {
        let path = temp_db_path();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();
        let first = store.bind(-1001, Uuid::new_v4()).await.unwrap();
        let second = store.bind(-1002, Uuid::new_v4()).await.unwrap();

        assert_eq!(store.bindings().await.unwrap(), vec![first, second]);

        store.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn rejects_binding_one_space_to_multiple_groups() {
        let path = temp_db_path();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();
        let space_id = Uuid::new_v4();
        store.bind(-1001, space_id).await.unwrap();

        let error = store.bind(-1002, space_id).await.unwrap_err();
        assert!(error.to_string().contains("UNIQUE constraint failed"));
        assert_eq!(
            store
                .binding_for_space(space_id)
                .await
                .unwrap()
                .unwrap()
                .tg_chat_id,
            -1001
        );

        store.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn paused_binding_is_not_restored_and_bind_resumes_it() {
        let path = temp_db_path();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();
        let space_id = Uuid::new_v4();
        let binding = store.bind(-1001, space_id).await.unwrap();

        store
            .pause_binding(binding.id, "missing permission")
            .await
            .unwrap();
        assert!(store.bindings().await.unwrap().is_empty());

        assert_eq!(store.bind(-1001, space_id).await.unwrap(), binding);
        assert_eq!(store.bindings().await.unwrap(), vec![binding]);

        store.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn unbind_deletes_binding_state() {
        let path = temp_db_path();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();
        let binding = store.bind(-1001, Uuid::new_v4()).await.unwrap();

        assert_eq!(store.unbind(-1001).await.unwrap(), Some(binding));
        assert_eq!(store.unbind(-1001).await.unwrap(), None);
        assert!(store.bindings().await.unwrap().is_empty());

        store.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn topic_mappings_can_be_listed_and_deleted() {
        let path = temp_db_path();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();
        let binding = store.bind(-1001, Uuid::new_v4()).await.unwrap();
        let channel_id = Uuid::new_v4();
        let topic = TopicRef {
            tg_chat_id: binding.tg_chat_id,
            message_thread_id: 42,
        };
        store
            .insert_topic(binding, channel_id, topic, 1)
            .await
            .unwrap();

        assert_eq!(
            store.topics(binding).await.unwrap(),
            vec![MappedTopic { channel_id, topic }]
        );
        store.delete_topic(binding.id, channel_id).await.unwrap();
        assert!(store.topics(binding).await.unwrap().is_empty());

        store.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn message_map_round_trips_and_deletes_in_both_directions() {
        let path = temp_db_path();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();
        let binding = store.bind(-1001, Uuid::new_v4()).await.unwrap();
        let boluo_message_id = Uuid::new_v4();
        let media_id = Uuid::new_v4();

        store
            .record_message(binding.id, boluo_message_id, 555, true, Some(media_id))
            .await
            .unwrap();

        assert_eq!(
            store
                .boluo_message_by_tg(binding.id, 555)
                .await
                .unwrap(),
            Some(MappedMessage {
                boluo_message_id,
                boluo_media_id: Some(media_id),
            })
        );
        assert_eq!(
            store
                .tg_message_by_boluo(binding.id, boluo_message_id)
                .await
                .unwrap(),
            Some((555, true))
        );

        store
            .delete_message_map(binding.id, boluo_message_id)
            .await
            .unwrap();
        assert_eq!(
            store.boluo_message_by_tg(binding.id, 555).await.unwrap(),
            None
        );

        store.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn message_map_is_cleared_when_binding_is_removed() {
        let path = temp_db_path();
        let store = Store::open(&path, "https://boluo.example").await.unwrap();
        let binding = store.bind(-1001, Uuid::new_v4()).await.unwrap();
        let boluo_message_id = Uuid::new_v4();
        store
            .record_message(binding.id, boluo_message_id, 7, false, None)
            .await
            .unwrap();

        store.unbind(-1001).await.unwrap();
        assert_eq!(
            store
                .tg_message_by_boluo(binding.id, boluo_message_id)
                .await
                .unwrap(),
            None
        );

        store.pool.close().await;
        std::fs::remove_file(path).unwrap();
    }
}
