use std::sync::OnceLock;

use crate::channels::ChannelType;

pub fn get_postgres_url() -> String {
    std::env::var("DATABASE_URL").expect("Failed to load Postgres connect URL")
}

pub async fn get() -> sqlx::Pool<sqlx::Postgres> {
    static POOL: OnceLock<sqlx::Pool<sqlx::Postgres>> = OnceLock::new();
    if let Some(pool) = POOL.get() {
        pool.clone()
    } else {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .after_connect(|conn, _meta| {
                Box::pin(async move {
                    use sqlx::Executor;
                    conn.execute(
                        "SET application_name = 'boluo-server'; SET statement_timeout = 20000;",
                    )
                    .await?;

                    Ok(())
                })
            })
            .max_connections(5)
            .connect(&get_postgres_url())
            .await
            .expect("Cannot connect to database");
        POOL.get_or_init(move || pool).clone()
    }
}

/// Runtime check if the database is available and can correctly deserialize data
pub async fn check() {
    use crate::channels::{Channel, ChannelMember};
    use crate::media::models::Media;
    use crate::messages::Message;
    use crate::spaces::{Space, SpaceMember};
    use crate::users::{User, UserExt};
    use serde_json::json;
    let pool = get().await;
    sqlx::query("SELECT 1 AS x")
        .fetch_one(&pool)
        .await
        .expect("Cannot connect to database");
    let mut trans = pool.begin().await.expect("Cannot start transaction");
    let user = sqlx::query_file_scalar!(
        "sql/users/create.sql",
        "madoka@low-of-cycles.com",
        "madoka",
        "Madoka",
        "homura_love"
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot create user");
    let _settings = sqlx::query_file_scalar!(
        "sql/users/set_settings.sql",
        user.id,
        serde_json::json!({ "theme": "homura"})
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot set settings");
    let _user_ext: UserExt = sqlx::query_scalar(
        r#"SELECT users_extension AS "ext!: UserExt" FROM users_extension WHERE user_id = $1"#,
    )
    .bind(user.id)
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot get user extension");

    let space = sqlx::query_file_scalar!(
        "sql/spaces/create.sql",
        "Low of Cycles",
        user.id,
        "",
        "d20",
        ""
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot create space");
    let space_member =
        sqlx::query_file!("sql/spaces/add_user_to_space.sql", user.id, space.id, true)
            .fetch_one(&mut *trans)
            .await
            .expect("Cannot add user to space")
            .member;
    let space_members = sqlx::query_file!("sql/spaces/get_members_by_spaces.sql", space.id)
        .fetch_all(&mut *trans)
        .await
        .expect("Cannot get space members");
    assert_eq!(space_members.len(), 1);
    assert_eq!(space_members[0].user.id, space_member.user_id);
    let channel = sqlx::query_file_scalar!(
        "sql/channels/create_channel.sql",
        space.id,
        "General",
        true,
        "d20",
        ChannelType::InGame.as_str(),
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot create channel");
    let _channel_member = sqlx::query_file!(
        "sql/channels/add_user_to_channel.sql",
        user.id,
        channel.id,
        "Madokami",
        true,
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot add user to channel")
    .member;

    let media = sqlx::query_file_scalar!(
        "sql/media/create.sql",
        uuid::Uuid::new_v4(),
        "image/png",
        user.id,
        "homura.png",
        "homura.png",
        "",
        10000,
        ""
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot create media");

    let _message = sqlx::query_file_scalar!(
        "sql/messages/create.sql",
        uuid::Uuid::new_v4(),
        user.id,
        channel.id,
        "Madokami",
        "Love you, Homura",
        &json!([]),
        true,
        false,
        true,
        &[],
        media.id,
        1,
        1,
        "white"
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot create message");
}
