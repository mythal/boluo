use chrono::prelude::*;
use postgres_types::FromSql;
use serde::Serialize;
use ts_rs::TS;
use uuid::Uuid;

use crate::database::Querist;
use crate::error::{DbError, ModelError};
use crate::utils::{inner_result_map, merge_blank};

#[derive(Debug, Serialize, FromSql, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "users")]
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
}

impl User {
    pub async fn all<T: Querist>(db: &mut T) -> Result<Vec<User>, DbError> {
        let rows = db.query_typed(include_str!("sql/all.sql"), &[], &[]).await?;
        let mut users = vec![];
        for row in rows {
            users.push(row.try_get(0)?);
        }
        Ok(users)
    }

    pub async fn register<T: Querist>(
        db: &mut T,
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

        let row = db
            .query_exactly_one(
                include_str!("sql/create.sql"),
                &[&email, &username, &&*nickname, &password],
            )
            .await?;
        row.try_get(0).map_err(Into::into)
    }

    async fn get<T: Querist>(
        db: &mut T,
        id: Option<&Uuid>,
        email: Option<&str>,
        username: Option<&str>,
    ) -> Result<Option<User>, DbError> {
        use postgres_types::Type;

        let email = email.map(|s| s.to_ascii_lowercase());
        let row = db
            .query_one_typed(
                include_str!("sql/get.sql"),
                &[Type::UUID, Type::TEXT, Type::TEXT],
                &[&id, &email, &username],
            )
            .await;
        inner_result_map(row, |row| row.try_get(0))
    }

    pub async fn login<T: Querist>(db: &mut T, username: &str, password: &str) -> Result<Option<User>, DbError> {
        use postgres_types::Type;

        let row = db
            .query_one_typed(
                include_str!("sql/login.sql"),
                &[Type::TEXT, Type::TEXT],
                &[&username, &password],
            )
            .await?;

        let result = row.and_then(|row| if row.get(0) { Some(row.get(1)) } else { None });
        Ok(result)
    }

    pub async fn get_by_id<T: Querist>(db: &mut T, id: &Uuid) -> Result<Option<User>, DbError> {
        User::get(db, Some(id), None, None).await
    }

    pub async fn get_by_email<T: Querist>(db: &mut T, email: &str) -> Result<Option<User>, DbError> {
        User::get(db, None, Some(email), None).await
    }

    pub async fn get_by_username<T: Querist>(db: &mut T, username: &str) -> Result<Option<User>, DbError> {
        User::get(db, None, None, Some(username)).await
    }

    pub async fn reset_password<T: Querist>(db: &mut T, id: Uuid, password: &str) -> Result<(), ModelError> {
        use crate::validators::PASSWORD;
        use postgres_types::Type;

        PASSWORD.run(password)?;

        db.execute_typed(
            include_str!("sql/reset_password.sql"),
            &[Type::UUID, Type::TEXT],
            &[&id, &password],
        )
        .await?;
        Ok(())
    }

    pub async fn deactivated<T: Querist>(db: &mut T, id: &Uuid) -> Result<u64, DbError> {
        db.execute(include_str!("sql/deactivated.sql"), &[id]).await
    }

    pub async fn edit<T: Querist>(
        db: &mut T,
        id: &Uuid,
        nickname: Option<String>,
        bio: Option<String>,
        avatar: Option<Uuid>,
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
        let row = db
            .query_exactly_one(include_str!("sql/edit.sql"), &[id, &nickname, &bio, &avatar])
            .await?;
        row.try_get(0).map_err(Into::into)
    }
}

#[derive(Debug, Serialize, FromSql, Clone)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "users_extension")]
pub struct UserExt {
    pub user_id: Uuid,
    pub settings: serde_json::Value,
}

impl UserExt {
    pub async fn get_settings<T: Querist>(db: &mut T, user_id: Uuid) -> Result<serde_json::Value, DbError> {
        let user_ext = db
            .query_one(include_str!("sql/get_settings.sql"), &[&user_id])
            .await?
            .map(|row| row.get(0));
        Ok(user_ext.unwrap_or_else(|| serde_json::Value::Object(serde_json::Map::new())))
    }

    pub async fn update_settings<T: Querist>(
        db: &mut T,
        user_id: Uuid,
        settings: serde_json::Value,
    ) -> Result<serde_json::Value, DbError> {
        let row = db
            .query_exactly_one(include_str!("sql/set_settings.sql"), &[&user_id, &settings])
            .await?;
        row.try_get(0).map_err(Into::into)
    }

    pub async fn partial_update_settings<T: Querist>(
        db: &mut T,
        user_id: Uuid,
        settings: serde_json::Value,
    ) -> Result<serde_json::Value, DbError> {
        let row = db
            .query_exactly_one(include_str!("sql/partial_set_settings.sql"), &[&user_id, &settings])
            .await?;
        row.try_get(0).map_err(Into::into)
    }
}

#[tokio::test]
async fn user_test() -> Result<(), crate::error::AppError> {
    use crate::database::Client;
    use crate::media::Media;

    let mut client = Client::new().await?;
    let mut trans = client.transaction().await.unwrap();
    let db = &mut trans;
    let email = "humura@humura.net";
    let username = "humura";
    let nickname = "Akami Humura";
    let password = "MadokaMadokaSuHaSuHa";
    let new_user = User::register(db, email, username, nickname, password).await.unwrap();
    let user = User::get_by_id(db, &new_user.id).await?.unwrap();
    assert_eq!(user.email, email);
    let user = User::login(db, username, password).await.unwrap().unwrap();
    assert_eq!(user.nickname, nickname);

    let avatar = Media::create(
        db,
        "text/plain",
        user.id,
        "avatar.jpg",
        "avatar.jpg",
        "".to_string(),
        0,
        "",
    )
    .await?;
    let new_nickname = "动感超人";
    let bio = "千片万片无数片";
    let user_altered = User::edit(
        db,
        &user.id,
        Some(new_nickname.to_string()),
        Some(bio.to_string()),
        Some(avatar.id),
    )
    .await?;
    assert_eq!(user_altered.nickname, new_nickname);
    assert_eq!(user_altered.bio, bio);
    assert_eq!(user_altered.avatar_id, Some(avatar.id));
    User::reset_password(db, user.id, "hahahahha").await.unwrap();
    let settings = UserExt::update_settings(db, user.id, serde_json::json!({"madoka": "homura"})).await?;
    assert_eq!(
        *settings.get("madoka").unwrap(),
        serde_json::Value::String("homura".to_string())
    );
    UserExt::update_settings(db, user.id, serde_json::json!({"homura": "madoka"})).await?;
    let settings = UserExt::get_settings(db, user.id).await?;
    assert_eq!(
        *settings.get("homura").unwrap(),
        serde_json::Value::String("madoka".to_string())
    );

    User::deactivated(db, &new_user.id).await.unwrap();

    let all_users = User::all(db).await.unwrap();
    assert!(!all_users.into_iter().any(|u| u.id == user.id));
    Ok(())
}
