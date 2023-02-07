use crate::error::DbError;
use crate::utils::inner_result_map;
use crate::{context::media_path, database::Querist};
use chrono::prelude::*;
use postgres_types::FromSql;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use ts_rs::TS;
use uuid::Uuid;

pub struct MediaFile {
    pub mime_type: String,
    pub filename: String,
    pub original_filename: String,
    pub hash: String,
    pub size: usize,
    pub duplicate: bool,
}

impl MediaFile {
    pub async fn create<T: Querist>(self, db: &mut T, user_id: Uuid, source: &str) -> Result<Media, DbError> {
        Media::create(
            db,
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

#[derive(Debug, Serialize, Deserialize, FromSql, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "media")]
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
    pub fn path(filename: &str) -> PathBuf {
        let mut path = media_path().to_owned();
        path.push(filename);
        path
    }

    pub async fn get_by_id<T: Querist>(db: &mut T, media_id: &Uuid) -> Result<Option<Media>, DbError> {
        let result = db.query_one(include_str!("sql/get_by_id.sql"), &[media_id]).await;
        inner_result_map(result, |row| row.try_get(0))
    }

    pub async fn get_by_filename<T: Querist>(db: &mut T, filename: &str) -> Result<Option<Media>, DbError> {
        let result = db
            .query_one(include_str!("sql/get_by_filename.sql"), &[&filename])
            .await;
        inner_result_map(result, |row| row.try_get(0))
    }

    pub async fn create<T: Querist>(
        db: &mut T,
        mime_type: &str,
        uploader_id: Uuid,
        filename: &str,
        original_filename: &str,
        hash: String,
        size: i32,
        source: &str,
    ) -> Result<Media, DbError> {
        let row = db
            .query_exactly_one(
                include_str!("sql/create.sql"),
                &[
                    &mime_type,
                    &uploader_id,
                    &filename,
                    &original_filename,
                    &hash,
                    &size,
                    &source,
                ],
            )
            .await?;
        row.try_get(0)
    }
}
