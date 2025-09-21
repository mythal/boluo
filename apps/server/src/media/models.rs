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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::users::User;

    async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> User {
        let raw = uuid::Uuid::new_v4().simple().to_string();
        let username = format!("{prefix}_{}", &raw[..8]);
        let email = format!("{prefix}_{raw}@example.com");
        User::register(pool, &email, &username, "Media Tester", "MediaPass123!")
            .await
            .expect("failed to create test user")
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_media_create_and_fetch(pool: sqlx::PgPool) {
        let user = create_test_user(&pool, "media").await;
        let media_id = uuid::Uuid::new_v4();
        let filename = format!("file_{}.png", uuid::Uuid::new_v4().simple());
        let original_filename = "test_image.png";
        let hash = uuid::Uuid::new_v4().simple().to_string();
        let size = 1024;
        let source = "upload";

        let created = Media::create(
            &pool,
            &media_id,
            "image/png",
            user.id,
            &filename,
            original_filename,
            hash.clone(),
            size,
            source,
        )
        .await
        .expect("failed to insert media");

        assert_eq!(created.id, media_id);
        assert_eq!(created.filename, filename);
        assert_eq!(created.original_filename, original_filename);
        assert_eq!(created.hash, hash);
        assert_eq!(created.size, size);
        assert_eq!(created.source, source);
        assert_eq!(created.uploader_id, user.id);

        let fetched_by_id = Media::get_by_id(&pool, &media_id)
            .await
            .expect("get by id failed")
            .expect("media not found by id");
        assert_eq!(fetched_by_id.id, created.id);

        let fetched_by_filename = Media::get_by_filename(&pool, &filename)
            .await
            .expect("get by filename failed")
            .expect("media not found by filename");
        assert_eq!(fetched_by_filename.id, created.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_media_file_create_helper(pool: sqlx::PgPool) {
        let user = create_test_user(&pool, "mediafile").await;
        let media_id = uuid::Uuid::new_v4();
        let filename = format!("helper_{}.jpg", uuid::Uuid::new_v4().simple());
        let original_filename = "helper.jpg";
        let hash = uuid::Uuid::new_v4().simple().to_string();
        let size = 2048usize;
        let source = "import";

        let media_file = MediaFile {
            id: media_id,
            mime_type: "image/jpeg".to_string(),
            filename: filename.clone(),
            original_filename: original_filename.to_string(),
            hash: hash.clone(),
            size,
            duplicate: false,
        };

        let created = media_file
            .create(&pool, user.id, source)
            .await
            .expect("MediaFile::create failed");

        assert_eq!(created.id, media_id);
        assert_eq!(created.filename, filename);
        assert_eq!(created.original_filename, original_filename);
        assert_eq!(created.hash, hash);
        assert_eq!(created.size, size as i32);
        assert_eq!(created.source, source);
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
