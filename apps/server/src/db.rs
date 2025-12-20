use std::sync::OnceLock;

use crate::channels::ChannelType;

pub static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

pub fn get_postgres_url() -> String {
    std::env::var("DATABASE_URL").expect("Failed to load Postgres connect URL")
}

pub async fn get() -> sqlx::Pool<sqlx::Postgres> {
    static POOL: OnceLock<sqlx::Pool<sqlx::Postgres>> = OnceLock::new();
    const LIFETIME: std::time::Duration = std::time::Duration::from_secs(60 * 60);
    const IDLE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(60 * 5);
    const ACQUIRE_SLOW_THRESHOLD: std::time::Duration = std::time::Duration::from_millis(800);
    const ACQUIRE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);
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
            .max_connections(32)
            .min_connections(4)
            .acquire_slow_threshold(ACQUIRE_SLOW_THRESHOLD)
            .acquire_timeout(ACQUIRE_TIMEOUT)
            .max_lifetime(Some(LIFETIME))
            .idle_timeout(Some(IDLE_TIMEOUT))
            .connect(&get_postgres_url())
            .await
            .expect("Cannot connect to database");

        POOL.get_or_init(move || pool).clone()
    }
}

pub async fn check_db_host() {
    use std::str::FromStr;

    let options = sqlx::postgres::PgConnectOptions::from_str(&get_postgres_url())
        .expect("Cannot parse Postgres connect URL");

    tracing::info!(
        "Connecting to database at {}:{}",
        options.get_host(),
        options.get_port()
    );

    let host = options.get_host();
    if host.starts_with('[') {
        return;
    }
    if let Ok(_addr) = host.parse::<std::net::IpAddr>() {
        return;
    }

    let resolved = tokio::net::lookup_host((options.get_host(), options.get_port()))
        .await
        .expect("Cannot resolve database host");

    for addr in resolved {
        tracing::info!("Resolved database address: {}", addr);
    }
}

/// Runtime check if the database is available and can correctly deserialize data
#[tracing::instrument]
pub async fn check(pool: &sqlx::Pool<sqlx::Postgres>) {
    use crate::channels::{Channel, ChannelMember};
    use crate::characters::{
        Character, CharacterVariable, CharacterVariableHistory, CharacterVisibility,
    };
    use crate::media::models::Media;
    use crate::messages::Message;
    use crate::notes::{Note, NoteHistory, NoteType, NoteVisibility};
    use crate::spaces::{Space, SpaceMember};
    use crate::users::{User, UserExt};
    use serde_json::json;

    let real_user_id = {
        let mut conn = pool.acquire().await.expect("Cannot acquire connection");

        sqlx::query("SELECT 1 AS x")
            .fetch_one(&mut *conn)
            .await
            .expect("Cannot connect to database");

        sqlx::query!("SELECT id FROM users LIMIT 1")
            .fetch_optional(&mut *conn)
            .await
            .expect("Failed to fetch real user id")
            .map(|x| x.id)
    };
    let mut trans = pool.begin().await.expect("Cannot start transaction");
    let user = sqlx::query_file_scalar!(
        "sql/users/create.sql",
        "madoka23432432432@law-of-cycles.com",
        "madoka23432432432",
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

    let character_alias = Some("homura".to_string());
    let character = sqlx::query_file_scalar!(
        "sql/characters/create.sql",
        "Homura",
        "Time traveler",
        "#7c4dff",
        character_alias,
        Some(media.id),
        space.id,
        user.id,
        CharacterVisibility::Private.as_str(),
        false,
        json!({}),
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot create character");

    let variable_alias = vec!["HP".to_string()];
    let variable = sqlx::query_file_scalar!(
        "sql/characters/variables/create.sql",
        "hp",
        character.id,
        "HP",
        &variable_alias,
        0,
        true,
        json!(100),
        json!({}),
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot create character variable");

    let variables = sqlx::query_file_scalar!(
        "sql/characters/variables/list_by_character.sql",
        character.id
    )
    .fetch_all(&mut *trans)
    .await
    .expect("Cannot list character variables");
    assert_eq!(variables.len(), 1);

    sqlx::query_file!(
        "sql/characters/variables/insert_history.sql",
        user.id,
        character.id,
        json!({"reason": "db-check"}),
        variable.key,
        json!(80),
    )
    .execute(&mut *trans)
    .await
    .expect("Cannot create character variable history");

    let variable_history = sqlx::query_file_scalar!(
        "sql/characters/variables/history_by_key.sql",
        character.id,
        "hp"
    )
    .fetch_all(&mut *trans)
    .await
    .expect("Cannot list character variable history");
    assert_eq!(variable_history.len(), 1);

    let note_keywords = vec!["magic".to_string()];
    let note_visible_to = vec![channel.id];
    let note = sqlx::query_file_scalar!(
        "sql/notes/create.sql",
        NoteType::Term.as_str(),
        space.id,
        "Magic",
        &note_keywords,
        user.id,
        "Magic is everywhere.",
        NoteVisibility::Channels.as_str(),
        &note_visible_to,
        true,
        true,
    )
    .fetch_one(&mut *trans)
    .await
    .expect("Cannot create note");

    let notes = sqlx::query_file_scalar!("sql/notes/list_by_space.sql", space.id)
        .fetch_all(&mut *trans)
        .await
        .expect("Cannot list notes");
    assert_eq!(notes.len(), 1);

    sqlx::query_file!(
        "sql/notes/insert_history.sql",
        note.id,
        Some(user.id),
        "Magic is everywhere.",
    )
    .execute(&mut *trans)
    .await
    .expect("Cannot create note history");

    let note_history = sqlx::query_file_scalar!("sql/notes/history_by_note.sql", note.id)
        .fetch_all(&mut *trans)
        .await
        .expect("Cannot list note history");
    assert_eq!(note_history.len(), 1);

    if let Some(real_user_id) = real_user_id {
        let _session = crate::session::start(real_user_id)
            .await
            .expect("Cannot create session");
        let _reset_token = crate::users::User::generate_reset_token(&mut *trans, real_user_id)
            .await
            .expect("Cannot generate reset token");
    } else {
        tracing::warn!("No real user id found, skipping session and reset token check");
    }
}

#[cfg(test)]
mod tests {
    #[sqlx::test(migrator = "super::MIGRATOR")]
    async fn db_test_check(pool: sqlx::PgPool) {
        use crate::users::User;
        let mut conn = pool.acquire().await.expect("Cannot acquire connection");

        let user = sqlx::query_file_scalar!(
            "sql/users/create.sql",
            "madoka23432432432@law-of-cycles.com",
            "madoka23432432432",
            "Madoka",
            "homura_love"
        )
        .fetch_one(&mut *conn)
        .await
        .expect("Cannot create user");

        assert_eq!(user.nickname, "Madoka");
    }
}
