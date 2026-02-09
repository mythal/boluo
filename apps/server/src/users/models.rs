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
        CACHE.invalidate(CacheType::User, id).await;
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

    pub fn generate_email_change_token(user_id: &Uuid, new_email: &str) -> String {
        use crate::utils::sign;
        use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD as base64_engine};
        use chrono::Utc;

        // Token expires in 24 hours
        let expire_sec = 60 * 60 * 24;
        let timestamp = Utc::now().timestamp() + expire_sec;

        // Format: user_id.new_email.timestamp.signature
        let mut buffer = String::with_capacity(256);
        base64_engine.encode_string(user_id.as_bytes(), &mut buffer);
        buffer.push('.');
        base64_engine.encode_string(new_email.as_bytes(), &mut buffer);
        buffer.push('.');
        buffer.push_str(&timestamp.to_string());

        let signature = sign(&buffer);
        buffer.push('.');
        base64_engine.encode_string(signature, &mut buffer);
        buffer
    }

    pub fn verify_email_change_token(token: &str) -> Result<(Uuid, String), anyhow::Error> {
        use crate::utils::verify;
        use anyhow::Context;
        use base64::{Engine as _, engine::general_purpose};
        use chrono::Utc;

        let mut iter = token.split('.');
        let parse_failed = || anyhow::anyhow!("Failed to parse email change token: {}", token);

        let user_id_str = iter.next().ok_or_else(parse_failed)?;
        let new_email_str = iter.next().ok_or_else(parse_failed)?;
        let timestamp_str = iter.next().ok_or_else(parse_failed)?;
        let signature = iter.next().ok_or_else(parse_failed)?;

        // Verify signature
        let message = format!("{}.{}.{}", user_id_str, new_email_str, timestamp_str);
        verify(&message, signature)?;

        // Check expiration
        let timestamp: i64 = timestamp_str
            .parse()
            .context("Failed to parse timestamp in email change token")?;
        let now = Utc::now().timestamp();
        if now > timestamp {
            return Err(anyhow::anyhow!("Email change token has expired"));
        }

        // Decode user ID
        let user_id_bytes = general_purpose::URL_SAFE_NO_PAD
            .decode(user_id_str)
            .or_else(|_| general_purpose::URL_SAFE.decode(user_id_str))
            .or_else(|_| general_purpose::STANDARD_NO_PAD.decode(user_id_str))
            .or_else(|_| general_purpose::STANDARD.decode(user_id_str))
            .context("Failed to decode user ID in email change token")?;

        // Decode new email
        let new_email_bytes = general_purpose::URL_SAFE_NO_PAD
            .decode(new_email_str)
            .or_else(|_| general_purpose::URL_SAFE.decode(new_email_str))
            .or_else(|_| general_purpose::STANDARD_NO_PAD.decode(new_email_str))
            .or_else(|_| general_purpose::STANDARD.decode(new_email_str))
            .context("Failed to decode new email in email change token")?;

        let user_id =
            Uuid::from_slice(&user_id_bytes).context("Failed to convert user ID bytes to UUID")?;
        let new_email = String::from_utf8(new_email_bytes)
            .context("Failed to convert new email bytes to string")?;

        Ok((user_id, new_email))
    }

    pub async fn change_email<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
        new_email: &str,
    ) -> Result<User, ModelError> {
        use crate::validators::EMAIL;

        let new_email = new_email.to_ascii_lowercase();
        EMAIL.run(&new_email)?;

        let user = sqlx::query_scalar!(
            r#"UPDATE users SET email = $1 WHERE id = $2 AND deactivated = false RETURNING users as "users!: User""#,
            new_email,
            user_id
        )
        .fetch_one(db)
        .await?;

        CACHE.User.insert(user.id, user.clone().into());
        Ok(user)
    }

    pub async fn mark_email_verified<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        user_id: &Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"INSERT INTO users_extension (user_id, email_verified_at)
               VALUES ($1, now() at time zone 'utc')
               ON CONFLICT (user_id)
               DO UPDATE SET email_verified_at = now() at time zone 'utc'"#,
            user_id
        )
        .execute(db)
        .await?;

        CACHE
            .invalidate(crate::cache::CacheType::UserExt, *user_id)
            .await;

        Ok(())
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

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn unique_identity(email_prefix: &str, username_prefix: &str) -> (String, String) {
        let raw = Uuid::new_v4().simple().to_string();
        let short = &raw[..8];
        (
            format!("{email_prefix}{raw}@example.com"),
            format!("{username_prefix}{short}"),
        )
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_user_register_and_lookup(pool: sqlx::PgPool) {
        let (email, username) = unique_identity("dbtest_", "dbuser_");
        let nickname = "DB Tester";
        let password = "SuperSafePass123!";

        let user = User::register(&pool, &email, &username, nickname, password)
            .await
            .expect("user registration failed");
        assert_ne!(user.password, password, "password should be hashed");

        let fetched = User::get_by_id(&pool, &user.id)
            .await
            .expect("query by id failed")
            .expect("user not found by id");
        assert_eq!(fetched.id, user.id);
        assert_eq!(fetched.username, username);
        assert_eq!(fetched.nickname, nickname);
        assert_eq!(fetched.email, email);

        let by_username = User::get_by_username(&pool, &username)
            .await
            .expect("query by username failed");
        assert!(by_username.is_some());

        let by_email = User::get_by_email(&pool, &email)
            .await
            .expect("query by email failed");
        assert!(by_email.is_some());
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_user_login_by_username_and_email(pool: sqlx::PgPool) {
        let (email, username) = unique_identity("login_", "loginuser_");
        let nickname = "Login User";
        let password = "LoginPass123!";

        let registered = User::register(&pool, &email, &username, nickname, password)
            .await
            .expect("user registration failed");

        let login_with_username = User::login(&pool, &username, password)
            .await
            .expect("login by username failed")
            .expect("valid credentials must return user");
        assert_eq!(login_with_username.id, registered.id);

        let login_with_email = User::login(&pool, &email, password)
            .await
            .expect("login by email failed")
            .expect("email login should return user");
        assert_eq!(login_with_email.id, registered.id);

        let failed_login = User::login(&pool, &username, "WrongPassword999")
            .await
            .expect("login query should succeed");
        assert!(
            failed_login.is_none(),
            "invalid password should not authenticate"
        );
    }

    #[sqlx::test(
        migrator = "crate::db::MIGRATOR",
        fixtures(path = "../../fixtures", scripts("0-users"))
    )]
    async fn db_test_user_fixture(pool: sqlx::PgPool) {
        let username: String =
            query_scalar!("SELECT username FROM users WHERE email = 'cloudberry@example.com'")
                .fetch_one(&pool)
                .await
                .expect("fetch user failed");
        assert_eq!(username, "cloudberry");
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_user_reset_password_flow(pool: sqlx::PgPool) {
        let (email, username) = unique_identity("reset_", "resetuser_");
        let nickname = "Reset User";
        let original_password = "ResetPass123!";
        let new_password = "ResetPass456!";

        let user = User::register(&pool, &email, &username, nickname, original_password)
            .await
            .expect("user registration failed");

        let token = User::generate_reset_token(&pool, user.id)
            .await
            .expect("generate reset token failed");
        let token_user = User::get_by_reset_token(&pool, token)
            .await
            .expect("fetch by reset token failed");
        assert_eq!(token_user.id, user.id);

        {
            let mut conn = pool.acquire().await.expect("failed to acquire connection");
            User::reset_password(&mut conn, user.id, token, new_password)
                .await
                .expect("reset password failed");
        }

        let login_new_password = User::login(&pool, &username, new_password)
            .await
            .expect("login with new password failed")
            .expect("new password should authenticate");
        assert_eq!(login_new_password.id, user.id);

        let login_old_password = User::login(&pool, &username, original_password)
            .await
            .expect("login with old password failed");
        assert!(
            login_old_password.is_none(),
            "old password should no longer authenticate"
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_user_ext_settings_flow(pool: sqlx::PgPool) {
        let (email, username) = unique_identity("settings_", "settings_");
        let nickname = "Settings User";
        let password = "SettingsPass123!";

        let user = User::register(&pool, &email, &username, nickname, password)
            .await
            .expect("user registration failed");

        let initial_settings = serde_json::json!({
            "theme": "dark",
            "enter_send": true
        });
        let user_ext = UserExt::update_settings(&pool, user.id, initial_settings.clone())
            .await
            .expect("failed to store settings");
        assert_eq!(user_ext.settings, initial_settings);

        let partial_settings = serde_json::json!({
            "enter_send": false,
            "expand_dice": true
        });
        let merged = UserExt::partial_update_settings(&pool, user.id, partial_settings.clone())
            .await
            .expect("failed to merge settings");
        assert_eq!(merged.settings["theme"], initial_settings["theme"]);
        assert_eq!(
            merged.settings["enter_send"],
            partial_settings["enter_send"]
        );
        assert_eq!(
            merged.settings["expand_dice"],
            partial_settings["expand_dice"]
        );

        let fetched = UserExt::get(&pool, user.id)
            .await
            .expect("failed to load settings");
        assert_eq!(fetched.settings, merged.settings);

        let is_verified = UserExt::is_email_verified(&pool, user.id)
            .await
            .expect("failed to check verification status");
        assert!(!is_verified);

        let verified_at = UserExt::get_email_verified_at(&pool, user.id)
            .await
            .expect("failed to get verification timestamp");
        assert!(verified_at.is_none());
    }

    #[test]
    fn test_email_verification_token_generation_and_verification() {
        let user_id = Uuid::new_v4();

        // Generate token
        let token = User::generate_email_verification_token(&user_id);

        // Verify token should succeed
        let verified_user_id = User::verify_email_verification_token(&token)
            .expect("Token verification should succeed");

        // Should return the same user ID
        assert_eq!(user_id, verified_user_id);
    }

    #[test]
    fn test_email_verification_token_invalid_format() {
        // Test with invalid token format
        let invalid_tokens = vec![
            "invalid",
            "invalid.token",
            "invalid.token.format.extra",
            "",
            "...",
        ];

        for invalid_token in invalid_tokens {
            let result = User::verify_email_verification_token(invalid_token);
            assert!(
                result.is_err(),
                "Invalid token '{}' should fail verification",
                invalid_token
            );
        }
    }

    #[test]
    fn test_email_verification_token_invalid_signature() {
        let user_id = Uuid::new_v4();
        let token = User::generate_email_verification_token(&user_id);

        // Tamper with the signature
        let mut parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 3);
        parts[2] = "invalid_signature";
        let tampered_token = parts.join(".");

        let result = User::verify_email_verification_token(&tampered_token);
        assert!(
            result.is_err(),
            "Token with invalid signature should fail verification"
        );
    }

    #[test]
    fn test_email_verification_token_expired() {
        use crate::utils::sign;
        use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD as base64_engine};
        use chrono::Utc;

        let user_id = Uuid::new_v4();

        // Create an expired token (timestamp in the past)
        let expired_timestamp = Utc::now().timestamp() - 60; // 1 minute ago
        let mut buffer = String::with_capacity(128);
        base64_engine.encode_string(user_id.as_bytes(), &mut buffer);
        buffer.push('.');
        buffer.push_str(&expired_timestamp.to_string());

        let signature = sign(&buffer);
        buffer.push('.');
        base64_engine.encode_string(signature, &mut buffer);

        let result = User::verify_email_verification_token(&buffer);
        assert!(result.is_err(), "Expired token should fail verification");

        // Check that the error message mentions expiration
        let error_message = result.unwrap_err().to_string();
        assert!(
            error_message.contains("expired"),
            "Error should mention token expiration"
        );
    }

    #[test]
    fn test_email_verification_token_url_safe_encoding() {
        use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};

        let user_id = Uuid::new_v4();
        let token = User::generate_email_verification_token(&user_id);

        // Split the token into parts
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 3);

        // All parts should be valid URL-safe base64
        for (i, part) in parts.iter().enumerate() {
            let decode_result = if i == 1 {
                // Timestamp is plain text, not base64
                continue;
            } else {
                URL_SAFE_NO_PAD.decode(part)
            };

            assert!(
                decode_result.is_ok(),
                "Part {} should be valid URL-safe base64: {}",
                i,
                part
            );

            // Should not contain URL-unsafe characters
            assert!(
                !part.contains('+'),
                "Part {} should not contain '+': {}",
                i,
                part
            );
            assert!(
                !part.contains('/'),
                "Part {} should not contain '/': {}",
                i,
                part
            );
            assert!(
                !part.contains('='),
                "Part {} should not contain '=': {}",
                i,
                part
            );
        }
    }

    #[test]
    fn test_email_verification_token_different_users() {
        let user_id1 = Uuid::new_v4();
        let user_id2 = Uuid::new_v4();

        let token1 = User::generate_email_verification_token(&user_id1);
        let token2 = User::generate_email_verification_token(&user_id2);

        // Tokens should be different
        assert_ne!(token1, token2);

        // Each token should verify to its respective user
        let verified_id1 = User::verify_email_verification_token(&token1).unwrap();
        let verified_id2 = User::verify_email_verification_token(&token2).unwrap();

        assert_eq!(user_id1, verified_id1);
        assert_eq!(user_id2, verified_id2);
        assert_ne!(verified_id1, verified_id2);
    }

    #[test]
    fn test_problematic_token_analysis() {
        // Test the specific token that was failing
        let problematic_token =
            "si8iZGESEfCV9wssn9pMIg.1752625737.-w-N9SFk29XKvkzlcudLciTdfU9q9kuKGp95s8vELAY";

        // Split the token and examine parts
        let parts: Vec<&str> = problematic_token.split('.').collect();
        println!("Token parts: {:?}", parts);
        println!("Number of parts: {}", parts.len());

        // Should be exactly 3 parts
        assert_eq!(
            parts.len(),
            3,
            "Token should have exactly 3 parts separated by '.'"
        );

        let user_id_str = parts[0];
        let timestamp_str = parts[1];
        let signature = parts[2];

        println!("User ID part: '{}'", user_id_str);
        println!("Timestamp part: '{}'", timestamp_str);
        println!("Signature part: '{}'", signature);

        // Check if user_id_str is valid base64
        use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
        let user_id_decode = URL_SAFE_NO_PAD.decode(user_id_str);
        assert!(
            user_id_decode.is_ok(),
            "User ID part should be valid URL-safe base64"
        );

        // Check if timestamp is valid
        let timestamp_parse: Result<i64, _> = timestamp_str.parse();
        assert!(timestamp_parse.is_ok(), "Timestamp should be valid i64");

        // Check if signature is valid base64
        let signature_decode = URL_SAFE_NO_PAD.decode(signature);
        assert!(
            signature_decode.is_ok(),
            "Signature should be valid URL-safe base64"
        );

        println!("All parts are valid format");

        // Now test the actual verification (this should fail due to wrong secret/expired)
        let result = User::verify_email_verification_token(problematic_token);
        println!("Verification result: {:?}", result);
        // We expect this to fail because it's likely expired or signed with different secret
    }

    #[test]
    fn test_email_change_token_generation_and_verification() {
        let user_id = Uuid::new_v4();
        let new_email = "new@example.com";

        // Generate token
        let token = User::generate_email_change_token(&user_id, new_email);

        // Verify token should succeed
        let (verified_user_id, verified_email) =
            User::verify_email_change_token(&token).expect("Token verification should succeed");

        // Should return the same user ID and email
        assert_eq!(user_id, verified_user_id);
        assert_eq!(new_email, verified_email);
    }

    #[test]
    fn test_email_change_token_invalid_format() {
        // Test with invalid token format
        let invalid_tokens = vec![
            "invalid",
            "invalid.token",
            "invalid.token.format",
            "invalid.token.format.extra.parts",
            "",
            "....",
        ];

        for invalid_token in invalid_tokens {
            let result = User::verify_email_change_token(invalid_token);
            assert!(
                result.is_err(),
                "Invalid token '{}' should fail verification",
                invalid_token
            );
        }
    }

    #[test]
    fn test_email_change_token_invalid_signature() {
        let user_id = Uuid::new_v4();
        let new_email = "test@example.com";
        let token = User::generate_email_change_token(&user_id, new_email);

        // Tamper with the signature
        let mut parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 4);
        parts[3] = "invalid_signature";
        let tampered_token = parts.join(".");

        let result = User::verify_email_change_token(&tampered_token);
        assert!(
            result.is_err(),
            "Token with invalid signature should fail verification"
        );
    }

    #[test]
    fn test_email_change_token_expired() {
        use crate::utils::sign;
        use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD as base64_engine};
        use chrono::Utc;

        let user_id = Uuid::new_v4();
        let new_email = "expired@example.com";

        // Create an expired token (timestamp in the past)
        let expired_timestamp = Utc::now().timestamp() - 60; // 1 minute ago
        let mut buffer = String::with_capacity(256);
        base64_engine.encode_string(user_id.as_bytes(), &mut buffer);
        buffer.push('.');
        base64_engine.encode_string(new_email.as_bytes(), &mut buffer);
        buffer.push('.');
        buffer.push_str(&expired_timestamp.to_string());

        let signature = sign(&buffer);
        buffer.push('.');
        base64_engine.encode_string(signature, &mut buffer);

        let result = User::verify_email_change_token(&buffer);
        assert!(result.is_err(), "Expired token should fail verification");

        // Check that the error message mentions expiration
        let error_message = result.unwrap_err().to_string();
        assert!(
            error_message.contains("expired"),
            "Error should mention token expiration"
        );
    }

    #[test]
    fn test_email_change_token_different_emails() {
        let user_id = Uuid::new_v4();
        let email1 = "test1@example.com";
        let email2 = "test2@example.com";

        let token1 = User::generate_email_change_token(&user_id, email1);
        let token2 = User::generate_email_change_token(&user_id, email2);

        // Tokens should be different
        assert_ne!(token1, token2);

        // Each token should verify to its respective email
        let (verified_id1, verified_email1) = User::verify_email_change_token(&token1).unwrap();
        let (verified_id2, verified_email2) = User::verify_email_change_token(&token2).unwrap();

        assert_eq!(user_id, verified_id1);
        assert_eq!(user_id, verified_id2);
        assert_eq!(email1, verified_email1);
        assert_eq!(email2, verified_email2);
        assert_ne!(verified_email1, verified_email2);
    }

    #[test]
    fn test_email_change_token_url_safe_encoding() {
        use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};

        let user_id = Uuid::new_v4();
        let new_email = "test+special@example.com"; // Email with special characters
        let token = User::generate_email_change_token(&user_id, new_email);

        // Split the token into parts
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 4);

        // All base64 parts should be valid URL-safe base64
        for (i, part) in parts.iter().enumerate() {
            let decode_result = if i == 2 {
                // Timestamp is plain text, not base64
                continue;
            } else {
                URL_SAFE_NO_PAD.decode(part)
            };

            assert!(
                decode_result.is_ok(),
                "Part {} should be valid URL-safe base64: {}",
                i,
                part
            );

            // Should not contain URL-unsafe characters
            assert!(
                !part.contains('+'),
                "Part {} should not contain '+': {}",
                i,
                part
            );
            assert!(
                !part.contains('/'),
                "Part {} should not contain '/': {}",
                i,
                part
            );
            assert!(
                !part.contains('='),
                "Part {} should not contain '=': {}",
                i,
                part
            );
        }
    }
}
