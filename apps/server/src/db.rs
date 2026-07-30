use std::sync::OnceLock;

use crate::channels::ChannelType;

pub static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

macro_rules! check_composite_row {
    ($db:expr, $table:literal, { $($field:ident: $field_type:ty),+ $(,)? }) => {{
        #[allow(dead_code)]
        #[derive(sqlx::Type)]
        #[sqlx(type_name = $table)]
        struct Record {
            $($field: $field_type),+
        }

        sqlx::query_scalar::<_, Record>(concat!(
            "SELECT ",
            $table,
            " FROM ",
            $table,
            " LIMIT 1"
        ))
        .fetch_one($db)
        .await
    }};
}

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
                        "SET application_name = 'boluo-server';
                         SET statement_timeout = 20000;
                         SET TIME ZONE 'UTC';",
                    )
                    .await?;

                    Ok(())
                })
            })
            .max_connections(32)
            .min_connections(16)
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
    use crate::characters::Character;
    use crate::entries::models::{
        Entry, EntryComponentHistory, EntryComponentHistoryAction, EntryHistory,
        EntryHistoryAction, components_as_set_changes,
    };
    use crate::media::models::Media;
    use crate::messages::Message;
    use crate::notes::{Note, NoteContentRevision};
    use crate::scopes::models::ScopeKind;
    use crate::spaces::{AccessPolicy, Space, SpaceMember};
    use crate::users::{User, UserExt};
    use serde_json::json;
    use shared_types::messages::Entities;
    use std::collections::BTreeMap;

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

    let message = sqlx::query_file_scalar!(
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

    let character = Character::create(
        &mut trans,
        space.id,
        user.id,
        "Homura",
        "homura",
        vec!["homu".to_string()],
        "Time traveler",
        "#7c4dff",
        AccessPolicy::Secret,
        None,
        vec!["player".to_string()],
    )
    .await
    .expect("Cannot create character");

    let private_scope_id = uuid::Uuid::now_v7();
    sqlx::query_file!(
        "sql/characters/create_scope.sql",
        private_scope_id,
        space.id,
        user.id,
        AccessPolicy::Secret.as_str(),
        None::<uuid::Uuid>,
    )
    .execute(&mut *trans)
    .await
    .expect("Cannot create private Character Scope");
    sqlx::query_file!(
        "sql/characters/bind_scope.sql",
        character.id,
        private_scope_id,
        "private",
    )
    .execute(&mut *trans)
    .await
    .expect("Cannot bind private Character Scope");

    let note_keywords = vec!["magic".to_string()];
    let note = Note::create(
        &mut trans,
        space.id,
        "Magic".to_string(),
        note_keywords,
        vec!["rules".to_string()],
        user.id,
        "Magic is everywhere.".to_string(),
        Entities::default(),
        AccessPolicy::Public,
        None,
    )
    .await
    .expect("Cannot create note");

    let notes = crate::notes::NoteMetadata::list_by_space(&mut *trans, space.id, false)
        .await
        .expect("Cannot list notes");
    assert_eq!(notes.len(), 1);

    let note_content_revisions = NoteContentRevision::list_by_note(&mut *trans, &note.id)
        .await
        .expect("Cannot list note content revisions");
    assert_eq!(note_content_revisions.len(), 1);

    let entry = Entry::create(
        &mut trans,
        space.scope_id,
        "magic".to_string(),
        vec!["spell".to_string()],
        "Magic".to_string(),
        Some(note.id),
        BTreeMap::from([("core/counter".to_string(), json!({"value": 1}))]),
        vec!["rules".to_string()],
        0,
    )
    .await
    .expect("Cannot create entry");
    let operation_id = uuid::Uuid::now_v7();
    EntryHistory::record(
        &mut trans,
        operation_id,
        Some(user.id),
        entry.scope_id,
        entry.id,
        Some(message.id),
        &entry.key,
        EntryHistoryAction::Create,
    )
    .await
    .expect("Cannot create entry history");
    EntryComponentHistory::record(
        &mut trans,
        operation_id,
        Some(user.id),
        entry.scope_id,
        entry.id,
        Some(message.id),
        &entry.key,
        &components_as_set_changes(&entry.components),
    )
    .await
    .expect("Cannot create entry component history");

    #[allow(dead_code)]
    #[derive(sqlx::Type)]
    #[sqlx(type_name = "identifier_kind", rename_all = "PascalCase")]
    enum IdentifierKind {
        Primary,
        Alias,
    }

    check_composite_row!(&mut *trans, "characters", {
        id: uuid::Uuid,
        name: String,
        description: String,
        color: String,
        space_id: uuid::Uuid,
        main_scope_id: uuid::Uuid,
        archived_at: Option<chrono::DateTime<chrono::Utc>>,
        tags: Vec<String>,
        created: chrono::DateTime<chrono::Utc>,
        modified: chrono::DateTime<chrono::Utc>,
        version: uuid::Uuid,
    })
    .expect("Cannot decode characters composite row");
    check_composite_row!(&mut *trans, "character_identifiers", {
        space_id: uuid::Uuid,
        character_id: uuid::Uuid,
        value: String,
        kind: IdentifierKind,
    })
    .expect("Cannot decode character_identifiers composite row");
    check_composite_row!(&mut *trans, "notes", {
        id: uuid::Uuid,
        space_id: uuid::Uuid,
        title: String,
        keywords: Vec<String>,
        tags: Vec<String>,
        creator_id: Option<uuid::Uuid>,
        text: String,
        entities: serde_json::Value,
        access_policy: AccessPolicy,
        access_channel_id: Option<uuid::Uuid>,
        revision: i64,
        archived_at: Option<chrono::DateTime<chrono::Utc>>,
        created: chrono::DateTime<chrono::Utc>,
        modified: chrono::DateTime<chrono::Utc>,
    })
    .expect("Cannot decode notes composite row");
    check_composite_row!(&mut *trans, "note_content_revisions", {
        note_id: uuid::Uuid,
        revision: i64,
        operator_id: Option<uuid::Uuid>,
        title: String,
        text: String,
        entities: serde_json::Value,
        created: chrono::DateTime<chrono::Utc>,
    })
    .expect("Cannot decode note_content_revisions composite row");
    check_composite_row!(&mut *trans, "scopes", {
        id: uuid::Uuid,
        space_id: uuid::Uuid,
        kind: ScopeKind,
        owner_id: Option<uuid::Uuid>,
        access_policy: AccessPolicy,
        access_channel_id: Option<uuid::Uuid>,
        version: uuid::Uuid,
        created: chrono::DateTime<chrono::Utc>,
        modified: chrono::DateTime<chrono::Utc>,
    })
    .expect("Cannot decode scopes composite row");
    check_composite_row!(&mut *trans, "character_scopes", {
        space_id: uuid::Uuid,
        character_id: uuid::Uuid,
        scope_id: uuid::Uuid,
        purpose: String,
    })
    .expect("Cannot decode character_scopes composite row");
    check_composite_row!(&mut *trans, "entries", {
        id: uuid::Uuid,
        scope_id: uuid::Uuid,
        display_name: String,
        reference_note_id: Option<uuid::Uuid>,
        tags: Vec<String>,
        sort: i32,
        metadata_version: uuid::Uuid,
        created: chrono::DateTime<chrono::Utc>,
        modified: chrono::DateTime<chrono::Utc>,
    })
    .expect("Cannot decode entries composite row");
    check_composite_row!(&mut *trans, "entry_identifiers", {
        scope_id: uuid::Uuid,
        entry_id: uuid::Uuid,
        value: String,
        kind: IdentifierKind,
    })
    .expect("Cannot decode entry_identifiers composite row");
    check_composite_row!(&mut *trans, "entry_history", {
        operation_id: uuid::Uuid,
        operator_id: Option<uuid::Uuid>,
        scope_id: uuid::Uuid,
        entry_id: uuid::Uuid,
        source_message_id: Option<uuid::Uuid>,
        key: String,
        previous_key: Option<String>,
        action: EntryHistoryAction,
        created: chrono::DateTime<chrono::Utc>,
    })
    .expect("Cannot decode entry_history composite row");
    check_composite_row!(&mut *trans, "entry_components", {
        entry_id: uuid::Uuid,
        component_type: String,
        data: serde_json::Value,
        schema_version: i32,
        version: uuid::Uuid,
        modified: chrono::DateTime<chrono::Utc>,
    })
    .expect("Cannot decode entry_components composite row");
    check_composite_row!(&mut *trans, "entry_component_history", {
        operation_id: uuid::Uuid,
        operator_id: Option<uuid::Uuid>,
        scope_id: uuid::Uuid,
        entry_id: uuid::Uuid,
        source_message_id: Option<uuid::Uuid>,
        key: String,
        component_type: String,
        action: EntryComponentHistoryAction,
        data: Option<serde_json::Value>,
        schema_version: Option<i32>,
        created: chrono::DateTime<chrono::Utc>,
    })
    .expect("Cannot decode entry_component_history composite row");

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
        super::check(&pool).await;
    }
}
