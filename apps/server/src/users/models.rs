use chrono::prelude::*;
use postgres_types::FromSql;
use serde::Serialize;
use sqlx::{query_file_scalar, query_scalar};
use ts_rs::TS;
use uuid::Uuid;

use crate::error::ModelError;
use crate::utils::merge_blank;

#[derive(Debug, Serialize, Clone, TS, FromSql)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: Uuid,
    #[serde(skip)]
    pub email: String,
    pub username: String,
    pub nickname: String,
    #[serde(skip)]
    pub password: String,
    pub bio: String,
    pub joined: DateTime<Utc>,
    #[serde(skip)]
    pub deactivated: bool,
    pub avatar_id: Option<Uuid>,
    /// See `Message::color`
    pub default_color: String,
}

// Expand from `sqlx::Type` to workaround
// https://github.com/launchbadge/sqlx/issues/1031
impl<'r> ::sqlx::decode::Decode<'r, ::sqlx::Postgres> for User {
    fn decode(
        value: ::sqlx::postgres::PgValueRef<'r>,
    ) -> ::std::result::Result<
        Self,
        ::std::boxed::Box<dyn ::std::error::Error + 'static + ::std::marker::Send + ::std::marker::Sync>,
    > {
        let mut decoder = ::sqlx::postgres::types::PgRecordDecoder::new(value)?;
        let id = decoder.try_decode::<Uuid>()?;
        let email = decoder.try_decode::<String>()?;
        let username = decoder.try_decode::<String>()?;
        let nickname = decoder.try_decode::<String>()?;
        let password = decoder.try_decode::<String>()?;
        let bio = decoder.try_decode::<String>()?;
        let joined = decoder.try_decode::<DateTime<Utc>>()?;
        let deactivated = decoder.try_decode::<bool>()?;
        let default_color = decoder.try_decode::<String>()?;
        let avatar_id = decoder.try_decode::<Option<Uuid>>()?;
        ::std::result::Result::Ok(User {
            id,
            email,
            username,
            nickname,
            password,
            bio,
            joined,
            deactivated,
            default_color,
            avatar_id,
        })
    }
}

impl sqlx::Type<sqlx::Postgres> for User {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        sqlx::postgres::PgTypeInfo::with_name("users")
    }
}

// impl<'r> sqlx::Decode<'r, sqlx::Postgres> for User
// where
//     &'r str: sqlx::Decode<'r, sqlx::Postgres>,
// {
//     fn decode(
//         value: sqlx::postgres::PgValueRef<'r>,
//     ) -> Result<User, Box<dyn std::error::Error + 'static + Send + Sync>> {
//         todo!()
//     }
// }

impl User {
    pub async fn all<'c, T: sqlx::PgExecutor<'c>>(db: T) -> Result<Vec<User>, sqlx::Error> {
        query_file_scalar!("sql/users/all.sql").fetch_all(db).await
    }

    pub async fn register<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        email: &str,
        username: &str,
        nickname: &str,
        password: &str,
    ) -> Result<User, ModelError> {
        use crate::validators::{DISPLAY_NAME, EMAIL, NAME, PASSWORD};
        let username = username.trim();
        let nickname = merge_blank(nickname);
        let email = email.to_ascii_lowercase();

        EMAIL.run(&email)?;
        DISPLAY_NAME.run(&nickname)?;
        NAME.run(username)?;
        PASSWORD.run(password)?;

        sqlx::query_file_scalar!("sql/users/create.sql", email, username, nickname, password)
            .fetch_one(db)
            .await
            .map_err(Into::into)
    }

    async fn get<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: Option<&Uuid>,
        email: Option<&str>,
        username: Option<&str>,
    ) -> Result<Option<User>, sqlx::Error> {
        let email = email.map(|s| s.to_ascii_lowercase());

        if let Some(id) = id {
            User::get_by_id(db, id).await
        } else if let Some(email) = email {
            User::get_by_email(db, &email).await
        } else if let Some(username) = username {
            User::get_by_username(db, username).await
        } else {
            Ok(None)
        }
    }

    pub async fn login<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        username: &str,
        password: &str,
    ) -> Result<Option<User>, sqlx::Error> {
        let result = sqlx::query_file!("sql/users/login.sql", username, password)
            .fetch_optional(db)
            .await?;
        if let Some(result) = result {
            if result.password_match {
                Ok(Some(result.user))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<Option<User>, sqlx::Error> {
        query_scalar!(
            r#"SELECT users as "users!: User" FROM users WHERE id = $1 AND deactivated = false LIMIT 1"#,
            id
        )
        .fetch_optional(db)
        .await
    }

    pub async fn get_by_email<'c, T: sqlx::PgExecutor<'c>>(db: T, email: &str) -> Result<Option<User>, sqlx::Error> {
        query_scalar!(
            r#"SELECT users as "users!: User" FROM users WHERE email = $1 AND deactivated = false LIMIT 1"#,
            email
        )
        .fetch_optional(db)
        .await
    }

    pub async fn get_by_username<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        username: &str,
    ) -> Result<Option<User>, sqlx::Error> {
        query_scalar!(
            r#"SELECT users as "users!: User" FROM users WHERE username = $1 AND deactivated = false LIMIT 1"#,
            username
        )
        .fetch_optional(db)
        .await
    }

    pub async fn reset_password<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: Uuid,
        password: &str,
    ) -> Result<(), ModelError> {
        use crate::validators::PASSWORD;

        PASSWORD.run(password)?;
        sqlx::query_file!("sql/users/reset_password.sql", id, password)
            .execute(db)
            .await?;
        Ok(())
    }

    pub async fn deactivated<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<u64, sqlx::Error> {
        sqlx::query_file!("sql/users/deactivated.sql", id)
            .execute(db)
            .await
            .map(|res| res.rows_affected())
    }

    pub async fn edit<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
        nickname: Option<String>,
        bio: Option<String>,
        avatar: Option<Uuid>,
        default_color: Option<String>,
    ) -> Result<User, ModelError> {
        use crate::validators::{BIO, DISPLAY_NAME};
        let nickname = nickname.map(|s| merge_blank(&s));
        let bio = bio.as_ref().map(|s| s.trim());
        if let Some(nickname) = &nickname {
            DISPLAY_NAME.run(nickname)?;
        }
        if let Some(bio) = bio {
            BIO.run(bio)?;
        }
        query_file_scalar!("sql/users/edit.sql", id, nickname, bio, avatar, default_color)
            .fetch_one(db)
            .await
            .map_err(Into::into)
    }
    pub async fn remove_avatar<'c, T: sqlx::PgExecutor<'c>>(db: T, id: &Uuid) -> Result<User, ModelError> {
        sqlx::query_file_scalar!("sql/users/remove_avatar.sql", id)
            .fetch_one(db)
            .await
            .map_err(Into::into)
    }
}

#[derive(Debug, Serialize, Clone, sqlx::Type)]
#[serde(rename_all = "camelCase")]
#[sqlx(type_name = "users_extension")]
pub struct UserExt {
    pub user_id: Uuid,
    pub settings: serde_json::Value,
}

impl UserExt {
    pub async fn get_settings<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
    ) -> Result<serde_json::Value, sqlx::Error> {
        sqlx::query_file_scalar!("sql/users/get_settings.sql", user_id)
            .fetch_optional(db)
            .await
            .map(|settings| settings.unwrap_or(serde_json::Value::Object(serde_json::Map::new())))
    }

    pub async fn update_settings<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        settings: serde_json::Value,
    ) -> Result<serde_json::Value, sqlx::Error> {
        sqlx::query_file_scalar!("sql/users/set_settings.sql", user_id, settings)
            .fetch_one(db)
            .await
            .map_err(Into::into)
    }

    pub async fn partial_update_settings<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        settings: serde_json::Value,
    ) -> Result<serde_json::Value, sqlx::Error> {
        sqlx::query_file_scalar!("sql/users/partial_set_settings.sql", user_id, settings)
            .fetch_one(db)
            .await
            .map_err(Into::into)
    }
}
