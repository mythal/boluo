use compact_str::CompactString;
use serde::{Deserialize, Serialize};
use shared_types::messages::Entities;
use std::ops::Deref;
use time::OffsetDateTime;
use unicode_normalization::UnicodeNormalization;
use uuid::Uuid;

use crate::error::{ModelError, ValidationFailed};
use crate::spaces::{AccessPolicy, validate_access_channel};

const KEYWORD_MAX_LEN: usize = 60;
const KEYWORD_MAX_COUNT: usize = 64;

fn normalize_keywords(keywords: Vec<String>) -> Result<Vec<String>, ValidationFailed> {
    let mut normalized = Vec::new();
    for keyword in keywords {
        let keyword = keyword.trim().to_lowercase().nfc().collect::<String>();
        if keyword.is_empty() || normalized.contains(&keyword) {
            continue;
        }
        if keyword.chars().count() > KEYWORD_MAX_LEN {
            return Err(ValidationFailed("Keyword is too long (max 60)."));
        }
        normalized.push(keyword);
    }
    if normalized.len() > KEYWORD_MAX_COUNT {
        return Err(ValidationFailed("Too many keywords (max 64)."));
    }
    Ok(normalized)
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, specta::Type, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct NoteMetadata {
    pub id: Uuid,
    pub space_id: Uuid,
    #[specta(type = String)]
    pub title: CompactString,
    #[specta(type = Vec<String>)]
    pub keywords: Vec<CompactString>,
    #[specta(type = Vec<String>)]
    pub tags: Vec<CompactString>,
    pub creator_id: Option<Uuid>,
    pub access_policy: AccessPolicy,
    pub access_channel_id: Option<Uuid>,
    #[specta(type = f64)]
    pub revision: i64,
    #[specta(type = Option<String>)]
    #[serde(with = "time::serde::rfc3339::option")]
    pub archived_at: Option<OffsetDateTime>,
    #[specta(type = OffsetDateTime)]
    #[serde(with = "time::serde::rfc3339")]
    pub created: OffsetDateTime,
    #[specta(type = OffsetDateTime)]
    #[serde(with = "time::serde::rfc3339")]
    pub modified: OffsetDateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    #[serde(flatten)]
    pub metadata: NoteMetadata,
    pub text: String,
    pub entities: Entities,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub(crate) struct NotePayload {
    text: String,
    entities: Entities,
}

impl NotePayload {
    #[cfg(test)]
    pub(crate) fn empty() -> Self {
        Self {
            text: String::new(),
            entities: Entities::default(),
        }
    }

    pub(crate) async fn load(
        db: &sqlx::PgPool,
        space_id: Uuid,
        note_id: Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, Self>(
            "SELECT text, entities FROM notes WHERE space_id = $1 AND id = $2",
        )
        .bind(space_id)
        .bind(note_id)
        .fetch_optional(db)
        .await
    }

    pub(crate) fn into_note(self, metadata: NoteMetadata) -> Note {
        Note {
            metadata,
            text: self.text,
            entities: self.entities,
        }
    }

    pub(crate) fn estimated_memory_bytes(&self) -> usize {
        std::mem::size_of::<Self>()
            + self.text.capacity()
            + self.entities.0.capacity() * std::mem::size_of::<shared_types::entities::Entity>()
    }
}

impl Deref for Note {
    type Target = NoteMetadata;

    fn deref(&self) -> &Self::Target {
        &self.metadata
    }
}

impl NoteMetadata {
    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        note_id: Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_file_as!(
            NoteMetadata,
            "sql/notes/get_metadata.sql",
            space_id,
            note_id
        )
        .fetch_optional(db)
        .await
    }

    pub async fn list_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        include_archived: bool,
    ) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_file_as!(
            NoteMetadata,
            "sql/notes/list.sql",
            space_id,
            include_archived
        )
        .fetch_all(db)
        .await
    }
}

impl Note {
    #[allow(clippy::too_many_arguments)]
    pub async fn create(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        space_id: Uuid,
        title: String,
        keywords: Vec<String>,
        tags: Vec<String>,
        creator_id: Uuid,
        text: String,
        entities: Entities,
        access_policy: AccessPolicy,
        access_channel_id: Option<Uuid>,
    ) -> Result<Note, ModelError> {
        let title = title.trim().to_string();
        let keywords = normalize_keywords(keywords)?;
        let tags = crate::validators::normalize_tags(tags)?;
        validate_access_channel(db, space_id, access_channel_id).await?;
        let note_id = Uuid::now_v7();
        let entities_json = serde_json::to_value(&entities)
            .unwrap_or_else(|_| serde_json::Value::Array(Vec::new()));
        sqlx::query_file!(
            "sql/notes/create.sql",
            note_id,
            space_id,
            title,
            &keywords,
            &tags,
            creator_id,
            text,
            entities_json,
            access_policy.as_str(),
            access_channel_id,
        )
        .execute(&mut **db)
        .await?;
        insert_content_revision(db, note_id, 1, Some(creator_id), &title, &text, &entities).await?;
        Self::get_by_id(&mut **db, space_id, note_id)
            .await?
            .ok_or(ModelError::NotFound("Note"))
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        note_id: Uuid,
    ) -> Result<Option<Note>, sqlx::Error> {
        let Some(row) = sqlx::query_file!("sql/notes/get.sql", space_id, note_id)
            .fetch_optional(db)
            .await?
        else {
            return Ok(None);
        };
        Ok(Some(Note {
            metadata: NoteMetadata {
                id: row.id,
                space_id: row.space_id,
                title: row.title,
                keywords: row.keywords,
                tags: row.tags,
                creator_id: row.creator_id,
                access_policy: row.access_policy,
                access_channel_id: row.access_channel_id,
                revision: row.revision,
                archived_at: row.archived_at,
                created: row.created,
                modified: row.modified,
            },
            text: row.text,
            entities: row.entities,
        }))
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        space_id: Uuid,
        note_id: Uuid,
        expected_revision: i64,
        title: String,
        keywords: Vec<String>,
        tags: Vec<String>,
        text: String,
        entities: Entities,
        access_policy: AccessPolicy,
        access_channel_id: Option<Uuid>,
        operator_id: Uuid,
    ) -> Result<Option<Note>, ModelError> {
        let title = title.trim().to_string();
        let keywords = normalize_keywords(keywords)?;
        let tags = crate::validators::normalize_tags(tags)?;
        validate_access_channel(db, space_id, access_channel_id).await?;
        let entities_json = serde_json::to_value(&entities)
            .unwrap_or_else(|_| serde_json::Value::Array(Vec::new()));
        let revision = sqlx::query_file_scalar!(
            "sql/notes/update.sql",
            space_id,
            note_id,
            expected_revision,
            title,
            &keywords,
            &tags,
            text,
            entities_json,
            access_policy.as_str(),
            access_channel_id,
        )
        .fetch_optional(&mut **db)
        .await?;
        let Some(revision) = revision else {
            return Ok(None);
        };
        insert_content_revision(
            db,
            note_id,
            revision,
            Some(operator_id),
            &title,
            &text,
            &entities,
        )
        .await?;
        Self::get_by_id(&mut **db, space_id, note_id)
            .await
            .map_err(Into::into)
    }

    pub async fn archive(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        space_id: Uuid,
        note_id: Uuid,
        expected_revision: i64,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query_file!(
            "sql/notes/archive.sql",
            space_id,
            note_id,
            expected_revision
        )
        .execute(&mut **db)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn restore(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        space_id: Uuid,
        note_id: Uuid,
        expected_revision: i64,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query_file!(
            "sql/notes/restore.sql",
            space_id,
            note_id,
            expected_revision
        )
        .execute(&mut **db)
        .await?;
        Ok(result.rows_affected() > 0)
    }
}

async fn insert_content_revision(
    db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    note_id: Uuid,
    revision: i64,
    operator_id: Option<Uuid>,
    title: &str,
    text: &str,
    entities: &Entities,
) -> Result<(), sqlx::Error> {
    let entities_json =
        serde_json::to_value(entities).unwrap_or_else(|_| serde_json::Value::Array(Vec::new()));
    sqlx::query_file!(
        "sql/notes/insert_content_revision.sql",
        note_id,
        revision,
        operator_id,
        title,
        text,
        entities_json,
    )
    .execute(&mut **db)
    .await?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NoteContentRevision {
    pub note_id: Uuid,
    #[specta(type = f64)]
    pub revision: i64,
    pub operator_id: Option<Uuid>,
    #[specta(type = String)]
    pub title: CompactString,
    pub text: String,
    pub entities: Entities,
    #[specta(type = OffsetDateTime)]
    #[serde(with = "time::serde::rfc3339")]
    pub created: OffsetDateTime,
}

impl NoteContentRevision {
    pub async fn list_by_note<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        note_id: &Uuid,
    ) -> Result<Vec<NoteContentRevision>, sqlx::Error> {
        let rows = sqlx::query_file!("sql/notes/list_content_revisions.sql", note_id)
            .fetch_all(db)
            .await?;
        rows.into_iter()
            .map(|row| {
                Ok(NoteContentRevision {
                    note_id: row.note_id,
                    revision: row.revision,
                    operator_id: row.operator_id,
                    title: row.title,
                    text: row.text,
                    entities: row.entities,
                    created: row.created,
                })
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spaces::Space;
    use crate::users::User;

    async fn create_test_user(pool: &sqlx::PgPool) -> User {
        let raw = Uuid::new_v4().simple().to_string();
        User::register(
            pool,
            &format!("note_{raw}@example.com"),
            &format!("note_{}", &raw[..8]),
            "Note Tester",
            "NotePass123!",
        )
        .await
        .expect("failed to create test user")
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_note_content_revisions_and_archive_state(pool: sqlx::PgPool) {
        let user = create_test_user(&pool).await;
        let space = Space::create(
            &pool,
            format!("note_{}", &Uuid::new_v4().simple().to_string()[..8]),
            &user.id,
            "notes".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("failed to create space");
        let mut tx = pool.begin().await.expect("begin failed");
        let note = Note::create(
            &mut tx,
            space.id,
            " Magic ".to_string(),
            vec![" Spell ".to_string(), "spell".to_string()],
            vec![" Rules ".to_string(), "rules".to_string()],
            user.id,
            "First".to_string(),
            Entities::default(),
            AccessPolicy::Public,
            None,
        )
        .await
        .expect("create failed");
        assert_eq!(note.keywords, vec!["spell"]);
        assert_eq!(note.tags, vec!["Rules", "rules"]);
        assert!(
            Note::get_by_id(&mut *tx, Uuid::new_v4(), note.id)
                .await
                .expect("mismatched Space lookup failed")
                .is_none()
        );
        assert!(
            Note::update(
                &mut tx,
                Uuid::new_v4(),
                note.id,
                1,
                "Wrong Space".to_string(),
                Vec::new(),
                Vec::new(),
                "Wrong Space".to_string(),
                Entities::default(),
                AccessPolicy::Public,
                None,
                user.id,
            )
            .await
            .expect("mismatched Space update failed")
            .is_none()
        );
        let formatted_entities = Entities(vec![shared_types::entities::Entity::Text(
            shared_types::entities::Span { start: 0, len: 6 },
        )]);
        let updated = Note::update(
            &mut tx,
            space.id,
            note.id,
            1,
            "Magic".to_string(),
            vec!["spell".to_string()],
            vec!["Magic".to_string()],
            "Second".to_string(),
            formatted_entities.clone(),
            AccessPolicy::Public,
            None,
            user.id,
        )
        .await
        .expect("update failed")
        .expect("revision matched");
        assert_eq!(updated.revision, 2);
        assert_eq!(updated.tags, vec!["Magic"]);
        assert_eq!(
            serde_json::to_value(&updated.entities).expect("serialize updated entities"),
            serde_json::to_value(&formatted_entities).expect("serialize expected entities")
        );
        assert!(
            Note::update(
                &mut tx,
                space.id,
                note.id,
                1,
                "Stale".to_string(),
                Vec::new(),
                Vec::new(),
                "Stale".to_string(),
                Entities::default(),
                AccessPolicy::Public,
                None,
                user.id,
            )
            .await
            .expect("stale update failed")
            .is_none()
        );
        assert!(
            Note::archive(&mut tx, space.id, note.id, updated.revision)
                .await
                .expect("archive failed")
        );
        let archived = Note::get_by_id(&mut *tx, space.id, note.id)
            .await
            .expect("get archived note failed")
            .expect("archived note missing");
        assert!(archived.archived_at.is_some());
        assert_eq!(archived.revision, updated.revision);
        assert!(
            Note::restore(&mut tx, space.id, note.id, updated.revision)
                .await
                .expect("restore failed")
        );
        let restored = Note::get_by_id(&mut *tx, space.id, note.id)
            .await
            .expect("get restored note failed")
            .expect("restored note missing");
        assert!(restored.archived_at.is_none());
        assert_eq!(restored.revision, updated.revision);
        let updated_after_restore = Note::update(
            &mut tx,
            space.id,
            note.id,
            restored.revision,
            "Magic".to_string(),
            vec!["spell".to_string()],
            vec!["Magic".to_string()],
            "Third".to_string(),
            Entities::default(),
            AccessPolicy::Public,
            None,
            user.id,
        )
        .await
        .expect("update after restore failed")
        .expect("restored note revision matched");
        assert_eq!(updated_after_restore.revision, 3);
        assert_eq!(updated_after_restore.text, "Third");
        assert!(updated_after_restore.entities.0.is_empty());
        tx.commit().await.expect("commit failed");
        let revisions = NoteContentRevision::list_by_note(&pool, &note.id)
            .await
            .expect("content revisions failed");
        assert_eq!(
            revisions
                .iter()
                .map(|revision| revision.revision)
                .collect::<Vec<_>>(),
            vec![3, 2, 1]
        );
        assert_eq!(revisions[0].text, "Third");
        assert!(revisions[0].entities.0.is_empty());
        assert_eq!(revisions[1].text, "Second");
        assert_eq!(
            serde_json::to_value(&revisions[1].entities).expect("serialize revision entities"),
            serde_json::to_value(&formatted_entities).expect("serialize expected entities")
        );
    }
}
#[test]
fn keywords_use_lowercase_nfc_for_deduplication() {
    assert_eq!(
        normalize_keywords(vec![
            " E\u{301} ".to_string(),
            "é".to_string(),
            "MAGIC".to_string(),
        ]),
        Ok(vec!["é".to_string(), "magic".to_string()])
    );
}
