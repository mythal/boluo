use chrono::prelude::*;
use serde::Serialize;
use sqlx::{query_file_scalar, query_scalar};
use std::collections::HashMap;
use uuid::Uuid;

use crate::cache::{CACHE, CacheType};
use crate::error::ModelError;
use crate::ttl::{Lifespan, Mortal, fetch_entry, fetch_entry_optional, hour};
use crate::utils::merge_blank;

#[derive(Debug, Serialize, Clone, sqlx::Type, specta::Type)]
#[sqlx(type_name = "users")]
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

impl Lifespan for User {
    fn ttl_sec() -> u64 {
        hour::HALF
    }
}

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

        let user =
            sqlx::query_file_scalar!("sql/users/create.sql", email, username, nickname, password)
                .fetch_one(db)
                .await?;
        CACHE.User.insert(user.id, user.clone().into());
        Ok(user)
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
                CACHE
                    .User
                    .insert(result.user.id, result.user.clone().into());
                Ok(Some(result.user))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    pub async fn get_by_id_list<'c, T: sqlx::PgExecutor<'c>, I: Iterator<Item = Uuid>>(
        db: T,
        id_list: I,
    ) -> Result<HashMap<Uuid, User>, sqlx::Error> {
        let mut query_ids: Vec<Uuid> = Vec::new();
        let mut result_map: HashMap<Uuid, User> = HashMap::new();
        for id in id_list {
            if let Some(user) = CACHE.User.get(&id).and_then(Mortal::fresh_only) {
                result_map.insert(user.id, user);
            } else {
                query_ids.push(id);
            }
        }
        let users = query_file_scalar!("sql/users/get_by_id_list.sql", &*query_ids)
            .fetch_all(db)
            .await?;
        for user in &users {
            CACHE.User.insert(user.id, user.clone().into());
            result_map.insert(user.id, user.clone());
        }
        Ok(result_map)
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<Option<User>, sqlx::Error> {
        fetch_entry_optional(&CACHE.User, *id, async {
            query_scalar!(
                r#"SELECT users as "users!: User" FROM users WHERE id = $1 AND deactivated = false LIMIT 1"#,
                id
            )
            .fetch_one(db)
            .await
        }).await
    }

    pub async fn get_by_email<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        email: &str,
    ) -> Result<Option<User>, sqlx::Error> {
        let user = query_scalar!(
            r#"SELECT users as "users!: User" FROM users WHERE email = $1 AND deactivated = false LIMIT 1"#,
            email
        )
        .fetch_optional(db)
        .await?;
        if let Some(user) = &user {
            CACHE.User.insert(user.id, user.clone().into());
        }
        Ok(user)
    }

    pub async fn get_by_username<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        username: &str,
    ) -> Result<Option<User>, sqlx::Error> {
        let user = query_scalar!(
            r#"SELECT users as "users!: User" FROM users WHERE username = $1 AND deactivated = false LIMIT 1"#,
            username
        )
        .fetch_optional(db)
        .await?;
        if let Some(user) = &user {
            CACHE.User.insert(user.id, user.clone().into());
        }
        Ok(user)
    }

    pub async fn generate_reset_token<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
    ) -> Result<Uuid, sqlx::Error> {
        let record = sqlx::query!(
            "
                INSERT INTO reset_tokens (user_id) VALUES ($1)
                RETURNING token
            ",
            user_id
        )
        .fetch_one(db)
        .await?;
        Ok(record.token)
    }

    pub async fn get_by_reset_token<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        token: Uuid,
    ) -> Result<User, sqlx::Error> {
        let user: User = query_file_scalar!("sql/users/get_by_reset_token.sql", token)
            .fetch_one(db)
            .await?;
        CACHE.User.insert(user.id, user.clone().into());
        Ok(user)
    }

    pub async fn reset_password(
        db: &mut sqlx::PgConnection,
        id: Uuid,
        token: Uuid,
        password: &str,
    ) -> Result<(), ModelError> {
        use crate::validators::PASSWORD;

        PASSWORD.run(password)?;
        sqlx::query_file!("sql/users/reset_password.sql", id, password)
            .execute(&mut *db)
            .await?;
        sqlx::query_file!("sql/users/reset_token_use.sql", id, token)
            .execute(&mut *db)
            .await?;
        sqlx::query_file!("sql/users/reset_token_invalidate.sql", id)
            .execute(&mut *db)
            .await?;
        Ok(())
    }

    pub async fn deactivated<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<u64, sqlx::Error> {
        let affected = sqlx::query_file!("sql/users/deactivated.sql", id)
            .execute(db)
            .await?
            .rows_affected();
        CACHE.invalidate(CacheType::User, *id).await;
        Ok(affected)
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
        let user = query_file_scalar!(
            "sql/users/edit.sql",
            id,
            nickname,
            bio,
            avatar,
            default_color
        )
        .fetch_one(db)
        .await?;
        CACHE.User.insert(user.id, user.clone().into());
        Ok(user)
    }
    pub async fn remove_avatar<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: &Uuid,
    ) -> Result<User, ModelError> {
        let user = sqlx::query_file_scalar!("sql/users/remove_avatar.sql", id)
            .fetch_one(db)
            .await?;
        CACHE.User.insert(user.id, user.clone().into());
        Ok(user)
    }

    pub fn generate_email_verification_token(user_id: &Uuid) -> String {
        use crate::utils::sign;
        use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD as base64_engine};
        use chrono::Utc;

        // Token expires in 24 hours
        let expire_sec = 60 * 60 * 24;
        let timestamp = Utc::now().timestamp() + expire_sec;

        // Format: user_id.timestamp.signature
        let mut buffer = String::with_capacity(128);
        base64_engine.encode_string(user_id.as_bytes(), &mut buffer);
        buffer.push('.');
        buffer.push_str(&timestamp.to_string());

        let signature = sign(&buffer);
        buffer.push('.');
        base64_engine.encode_string(signature, &mut buffer);
        buffer
    }

    pub fn verify_email_verification_token(token: &str) -> Result<Uuid, anyhow::Error> {
        use crate::utils::verify;
        use anyhow::Context;
        use base64::{Engine as _, engine::general_purpose};
        use chrono::Utc;

        let mut iter = token.split('.');
        let parse_failed =
            || anyhow::anyhow!("Failed to parse email verification token: {}", token);

        let user_id_str = iter.next().ok_or_else(parse_failed)?;
        let timestamp_str = iter.next().ok_or_else(parse_failed)?;
        let signature = iter.next().ok_or_else(parse_failed)?;

        // Verify signature
        let message = format!("{}.{}", user_id_str, timestamp_str);
        verify(&message, signature)?;

        // Check expiration
        let timestamp: i64 = timestamp_str
            .parse()
            .context("Failed to parse timestamp in email verification token")?;
        let now = Utc::now().timestamp();
        if now > timestamp {
            return Err(anyhow::anyhow!("Email verification token has expired"));
        }

        // Decode user ID
        let user_id_bytes = general_purpose::URL_SAFE_NO_PAD
            .decode(user_id_str)
            .or_else(|_| general_purpose::URL_SAFE.decode(user_id_str))
            .or_else(|_| general_purpose::STANDARD_NO_PAD.decode(user_id_str))
            .or_else(|_| general_purpose::STANDARD.decode(user_id_str))
            .context("Failed to decode user ID in email verification token")?;

        Uuid::from_slice(&user_id_bytes).context("Failed to convert user ID bytes to UUID")
    }

    pub async fn verify_email(
        db: &mut sqlx::PgConnection,
        user_id: &Uuid,
    ) -> Result<User, ModelError> {
        // Update email_verified_at in users_extension table
        sqlx::query!(
            r#"INSERT INTO users_extension (user_id, email_verified_at, settings)
               VALUES ($1, now() at time zone 'utc', '{}')
               ON CONFLICT (user_id)
               DO UPDATE SET email_verified_at = now() at time zone 'utc'"#,
            user_id
        )
        .execute(&mut *db)
        .await?;

        // Get the user
        let user = User::get_by_id(&mut *db, user_id)
            .await?
            .ok_or_else(|| sqlx::Error::RowNotFound)?;

        // Invalidate cache
        CACHE.User.insert(user.id, user.clone().into());
        CACHE
            .invalidate(crate::cache::CacheType::UserExt, *user_id)
            .await;

        Ok(user)
    }
}

#[derive(Debug, Serialize, Clone, sqlx::Type)]
#[serde(rename_all = "camelCase")]
#[sqlx(type_name = "users_extension")]
pub struct UserExt {
    pub user_id: Uuid,
    pub settings: serde_json::Value,
    pub email_verified_at: Option<DateTime<Utc>>,
}

impl Lifespan for UserExt {
    fn ttl_sec() -> u64 {
        hour::HALF
    }
}
impl UserExt {
    pub async fn get<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
    ) -> Result<UserExt, sqlx::Error> {
        fetch_entry(&CACHE.UserExt, user_id, async {
            sqlx::query_file_scalar!("sql/users/get_users_extension.sql", user_id)
                .fetch_one(db)
                .await
        })
        .await
    }

    pub async fn update_settings<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        settings: serde_json::Value,
    ) -> Result<UserExt, sqlx::Error> {
        let user_ext = sqlx::query_file_scalar!("sql/users/set_settings.sql", user_id, settings)
            .fetch_one(db)
            .await?;
        CACHE.UserExt.insert(user_id, user_ext.clone().into());
        Ok(user_ext)
    }

    pub async fn partial_update_settings<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
        settings: serde_json::Value,
    ) -> Result<UserExt, sqlx::Error> {
        let user_ext =
            sqlx::query_file_scalar!("sql/users/partial_set_settings.sql", user_id, settings)
                .fetch_one(db)
                .await?;
        CACHE.UserExt.insert(user_id, user_ext.clone().into());
        Ok(user_ext)
    }

    pub async fn is_email_verified<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query_scalar!(
            "SELECT email_verified_at FROM users_extension WHERE user_id = $1",
            user_id
        )
        .fetch_optional(db)
        .await?;

        Ok(result.flatten().is_some())
    }

    pub async fn get_email_verified_at<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: Uuid,
    ) -> Result<Option<DateTime<Utc>>, sqlx::Error> {
        let result = sqlx::query_scalar!(
            "SELECT email_verified_at FROM users_extension WHERE user_id = $1",
            user_id
        )
        .fetch_optional(db)
        .await?;

        Ok(result.flatten())
    }
}
