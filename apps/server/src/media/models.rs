use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub struct MediaFile {
    pub id: Uuid,
    pub mime_type: String,
    pub filename: String,
    pub original_filename: String,
    pub hash: String,
    pub size: usize,
    pub duplicate: bool,
}

impl MediaFile {
    pub async fn create<'c, T: sqlx::PgExecutor<'c>>(
        self,
        db: T,
        user_id: Uuid,
        source: &str,
    ) -> Result<Media, sqlx::Error> {
        Media::create(
            db,
            &self.id,
            &self.mime_type,
            user_id,
            &self.filename,
            &self.original_filename,
            self.hash,
            self.size as i32,
            source,
        )
        .await
    }
}

#[derive(Debug, Serialize, Deserialize, specta::Type, sqlx::Type)]
#[sqlx(type_name = "media")]
#[serde(rename_all = "camelCase")]
pub struct Media {
    pub id: Uuid,
    pub mime_type: String,
    pub uploader_id: Uuid,
    pub filename: String,
    pub original_filename: String,
    pub hash: String,
    pub size: i32,
    pub description: String,
    pub source: String,
    pub created: DateTime<Utc>,
}

impl Media {
    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        media_id: &Uuid,
    ) -> Result<Option<Media>, sqlx::Error> {
        let media = sqlx::query_file_scalar!("sql/media/get_by_id.sql", media_id)
            .fetch_optional(db)
            .await?;
        Ok(media)
    }

    pub async fn get_by_filename<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        filename: &str,
    ) -> Result<Option<Media>, sqlx::Error> {
        let media = sqlx::query_file_scalar!("sql/media/get_by_filename.sql", filename)
            .fetch_optional(db)
            .await?;
        Ok(media)
    }

    pub async fn create<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        media_id: &Uuid,
        mime_type: &str,
        uploader_id: Uuid,
        filename: &str,
        original_filename: &str,
        hash: String,
        size: i32,
        source: &str,
    ) -> Result<Media, sqlx::Error> {
        sqlx::query_file_scalar!(
            "sql/media/create.sql",
            media_id,
            mime_type,
            uploader_id,
            filename,
            original_filename,
            hash,
            size,
            source
        )
        .fetch_one(db)
        .await
    }
}
