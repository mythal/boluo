use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{ModelError, ValidationFailed};

const KEYWORD_MAX_LEN: usize = 60;

fn validate_keywords(keywords: &[String]) -> Result<(), ValidationFailed> {
    for keyword in keywords {
        if keyword.chars().count() > KEYWORD_MAX_LEN {
            return Err(ValidationFailed("Keyword is too long (max 60)."));
        }
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, specta::Type, sqlx::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(type_name = "note_type", rename_all = "PascalCase")]
pub enum NoteType {
    Term,
    Character,
}

impl NoteType {
    pub fn as_str(self) -> &'static str {
        match self {
            NoteType::Term => "Term",
            NoteType::Character => "Character",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, specta::Type, sqlx::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(type_name = "note_visibility", rename_all = "PascalCase")]
pub enum NoteVisibility {
    Private,
    Channels,
    Users,
    Public,
}

impl NoteVisibility {
    pub fn as_str(self) -> &'static str {
        match self {
            NoteVisibility::Private => "Private",
            NoteVisibility::Channels => "Channels",
            NoteVisibility::Users => "Users",
            NoteVisibility::Public => "Public",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, sqlx::Type)]
#[sqlx(type_name = "notes")]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: Uuid,
    #[serde(rename = "type")]
    pub note_type: NoteType,
    pub space_id: Uuid,
    pub title: String,
    pub keywords: Vec<String>,
    pub disabled: bool,
    pub owner_id: Uuid,
    pub content: String,
    pub visibility: NoteVisibility,
    pub visible_to: Vec<Uuid>,
    pub everyone_can_edit: bool,
    pub track_history: bool,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
}

impl Note {
    pub async fn create<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        note_type: NoteType,
        space_id: Uuid,
        title: &str,
        keywords: Vec<String>,
        owner_id: Uuid,
        content: &str,
        visibility: NoteVisibility,
        visible_to: Vec<Uuid>,
        everyone_can_edit: bool,
        track_history: bool,
    ) -> Result<Note, ModelError> {
        validate_keywords(&keywords)?;
        let note_type = note_type.as_str();
        let visibility = visibility.as_str();
        sqlx::query_file_scalar!(
            "sql/notes/create.sql",
            note_type,
            space_id,
            title,
            &keywords,
            owner_id,
            content,
            visibility,
            &visible_to,
            everyone_can_edit,
            track_history,
        )
        .fetch_one(db)
        .await
        .map_err(Into::into)
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        note_id: &Uuid,
    ) -> Result<Option<Note>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/notes/get_by_id.sql", note_id)
            .fetch_optional(db)
            .await
    }

    pub async fn list_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
    ) -> Result<Vec<Note>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/notes/list_by_space.sql", space_id)
            .fetch_all(db)
            .await
    }

    pub async fn update<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        note_id: &Uuid,
        note_type: Option<NoteType>,
        title: Option<&str>,
        keywords: Option<&Vec<String>>,
        content: Option<&str>,
        visibility: Option<NoteVisibility>,
        visible_to: Option<&Vec<Uuid>>,
        everyone_can_edit: Option<bool>,
        track_history: Option<bool>,
    ) -> Result<Option<Note>, ModelError> {
        if let Some(keywords) = keywords {
            validate_keywords(keywords)?;
        }
        let note_type = note_type.map(NoteType::as_str);
        let visibility = visibility.map(NoteVisibility::as_str);
        let keywords = keywords.map(|keywords| keywords.as_slice());
        let visible_to = visible_to.map(|visible_to| visible_to.as_slice());
        sqlx::query_file_scalar!(
            "sql/notes/update.sql",
            note_id,
            note_type,
            title,
            keywords,
            content,
            visibility,
            visible_to,
            everyone_can_edit,
            track_history,
        )
        .fetch_optional(db)
        .await
        .map_err(Into::into)
    }

    pub async fn delete<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        note_id: &Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query_file!("sql/notes/delete.sql", note_id)
            .execute(db)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, sqlx::Type)]
#[sqlx(type_name = "notes_history")]
#[serde(rename_all = "camelCase")]
pub struct NoteHistory {
    pub id: Uuid,
    pub note_id: Uuid,
    pub operator_id: Option<Uuid>,
    pub content: String,
    pub created: DateTime<Utc>,
}

impl NoteHistory {
    pub async fn create<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        note_id: &Uuid,
        operator_id: Option<Uuid>,
        content: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query_file!(
            "sql/notes/insert_history.sql",
            note_id,
            operator_id,
            content
        )
        .execute(db)
        .await?;
        Ok(())
    }

    pub async fn get_by_note<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        note_id: &Uuid,
    ) -> Result<Vec<NoteHistory>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/notes/history_by_note.sql", note_id)
            .fetch_all(db)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spaces::Space;
    use crate::users::User;
    use uuid::Uuid;

    fn unique_name(prefix: &str) -> String {
        let raw = Uuid::new_v4().simple().to_string();
        format!("{prefix}_{}", &raw[..6])
    }

    async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> User {
        let raw = Uuid::new_v4().simple().to_string();
        let username = format!("{prefix}_{}", &raw[..8]);
        let email = format!("{prefix}_{raw}@example.com");
        User::register(pool, &email, &username, "Note Tester", "NotePass123!")
            .await
            .expect("failed to create test user")
    }

    async fn create_test_space(pool: &sqlx::PgPool, owner: &User, prefix: &str) -> Space {
        let name = unique_name(prefix);
        let description = format!("Description for {name}");
        Space::create(pool, name, &owner.id, description, None, Some("d20"))
            .await
            .expect("failed to create space")
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_note_flow(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let space = create_test_space(&pool, &owner, "note_space").await;

        let note = Note::create(
            &pool,
            NoteType::Term,
            space.id,
            "Magic",
            vec!["magic".to_string()],
            owner.id,
            "Magic is everywhere.",
            NoteVisibility::Private,
            Vec::new(),
            true,
            true,
        )
        .await
        .expect("failed to create note");
        assert_eq!(note.title, "Magic");
        assert!(!note.disabled);

        let notes = Note::list_by_space(&pool, &space.id)
            .await
            .expect("list_by_space failed");
        assert_eq!(notes.len(), 1);

        let new_keywords = vec!["arcana".to_string()];
        let new_visible_to = Vec::new();
        let updated = Note::update(
            &pool,
            &note.id,
            Some(NoteType::Character),
            Some("Arcana"),
            Some(&new_keywords),
            Some("Arcana is learned."),
            Some(NoteVisibility::Public),
            Some(&new_visible_to),
            Some(false),
            Some(false),
        )
        .await
        .expect("update failed")
        .expect("note not found on update");
        assert_eq!(updated.note_type, NoteType::Character);
        assert_eq!(updated.title, "Arcana");
        assert_eq!(updated.keywords, new_keywords);
        assert_eq!(updated.visibility, NoteVisibility::Public);
        assert!(!updated.everyone_can_edit);
        assert!(!updated.track_history);

        NoteHistory::create(&pool, &note.id, Some(owner.id), "Magic is everywhere.")
            .await
            .expect("failed to create note history");
        let history = NoteHistory::get_by_note(&pool, &note.id)
            .await
            .expect("get_by_note failed");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].content, "Magic is everywhere.");
    }
}
