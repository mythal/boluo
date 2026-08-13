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

pub async fn connect(database_url: &str) -> sqlx::Pool<sqlx::Postgres> {
    const LIFETIME: std::time::Duration = std::time::Duration::from_secs(60 * 60);
    const IDLE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(60 * 5);
    const ACQUIRE_SLOW_THRESHOLD: std::time::Duration = std::time::Duration::from_millis(800);
    const ACQUIRE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);
    sqlx::postgres::PgPoolOptions::new()
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
        .connect(database_url)
        .await
        .expect("Cannot connect to database")
}

pub async fn check_db_host(database_url: &str) {
    use std::str::FromStr;

    let options = sqlx::postgres::PgConnectOptions::from_str(database_url)
        .expect("Cannot parse Postgres connect URL");

    if let Some(socket) = options.get_socket() {
        tracing::info!(
            "Connecting to database via Unix socket at {}:{}",
            socket.display(),
            options.get_port()
        );
        return;
    }

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
    use crate::assets::Asset;
    use crate::channels::{Channel, ChannelMember};
    use crate::characters::Character;
    use crate::entries::models::{
        Entry, EntryComponentHistory, EntryComponentHistoryAction, EntryComponentPayloadType,
        EntryEffect, EntryHistory, EntryHistoryAction, components_as_set_history_changes,
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
        None::<uuid::Uuid>,
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

    let asset = Asset::create(
        &mut trans,
        space.id,
        media.id,
        user.id,
        "Homura portrait",
        crate::assets::AssetPolicy::Listed,
    )
    .await
    .expect("Cannot create Asset");

    let message = sqlx::query_file_scalar!(
        "sql/messages/create.sql",
        uuid::Uuid::new_v4(),
        user.id,
        channel.id,
        "Madokami",
        None::<uuid::Uuid>,
        asset.id,
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
    let _portrait = crate::entries::models::Entry::create(
        &mut trans,
        character.scope_id,
        "homura_portrait".to_string(),
        Vec::new(),
        "Homura portrait".to_string(),
        None,
        std::collections::BTreeMap::from([(
            crate::entries::models::CORE_PORTRAIT_COMPONENT_TYPE.to_string(),
            crate::entries::models::EntryComponentPayloadInput::Asset { asset_id: asset.id },
        )]),
        Vec::new(),
        None,
    )
    .await
    .expect("Cannot create Character portrait");

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
        BTreeMap::from([(
            "core/counter".to_string(),
            crate::entries::models::EntryComponentPayloadInput::json(json!({"value": 1})),
        )]),
        vec!["rules".to_string()],
        None,
    )
    .await
    .expect("Cannot create entry");
    let effect = EntryEffect::create(&mut trans, space.id, entry.scope_id, user.id)
        .await
        .expect("Cannot create Entry Effect");
    EntryHistory::record(
        &mut trans,
        effect.id,
        entry.id,
        &entry.key,
        EntryHistoryAction::Create,
    )
    .await
    .expect("Cannot create entry history");
    EntryComponentHistory::record(
        &mut trans,
        effect.id,
        entry.id,
        &entry.key,
        &components_as_set_history_changes(&entry.components),
    )
    .await
    .expect("Cannot create entry component history");
    sqlx::query(
        r#"
        WITH component AS (
            INSERT INTO entry_components (entry_id, component_type, payload_type)
            VALUES ($1, 'example/illustration', 'Asset')
            RETURNING entry_id, component_type, payload_type
        )
        INSERT INTO entry_components_asset (
            entry_id,
            component_type,
            payload_type,
            scope_id,
            space_id,
            asset_id
        )
        SELECT entry_id, component_type, payload_type, $2, $3, $4
        FROM component
        "#,
    )
    .bind(entry.id)
    .bind(entry.scope_id)
    .bind(space.id)
    .bind(asset.id)
    .execute(&mut *trans)
    .await
    .expect("Cannot create Asset Entry Component");
    let attached_message =
        crate::messages::Message::attach_entry_effect(&mut trans, message.id, user.id, effect.id)
            .await
            .expect("Cannot attach Entry Effect")
            .expect("Message is not attachable");
    assert!(attached_message.has_entry_effects);
    assert!(
        crate::messages::Message::attach_entry_effect(&mut trans, message.id, user.id, effect.id,)
            .await
            .expect("Cannot check duplicate Entry Effect attachment")
            .is_none()
    );
    let second_effect = EntryEffect::create(&mut trans, space.id, entry.scope_id, user.id)
        .await
        .expect("Cannot create second Entry Effect");
    let attached_message = crate::messages::Message::attach_entry_effect(
        &mut trans,
        message.id,
        user.id,
        second_effect.id,
    )
    .await
    .expect("Cannot attach second Entry Effect")
    .expect("Message should accept multiple Entry Effects");
    assert!(attached_message.has_entry_effects);
    let message_effects = EntryEffect::list_by_message_ids(&mut *trans, space.id, &[message.id])
        .await
        .expect("Cannot list Entry Effects by Message");
    assert_eq!(message_effects.len(), 2);
    assert!(
        message_effects
            .iter()
            .all(|effect| effect.message_id == Some(message.id))
    );

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
        archived_at: Option<time::OffsetDateTime>,
        tags: Vec<String>,
        created: time::OffsetDateTime,
        modified: time::OffsetDateTime,
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
    check_composite_row!(&mut *trans, "assets", {
        id: uuid::Uuid,
        space_id: uuid::Uuid,
        media_id: uuid::Uuid,
        creator_id: Option<uuid::Uuid>,
        name: String,
        policy: crate::assets::AssetPolicy,
        created: time::OffsetDateTime,
    })
    .expect("Cannot decode assets composite row");
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
        archived_at: Option<time::OffsetDateTime>,
        created: time::OffsetDateTime,
        modified: time::OffsetDateTime,
    })
    .expect("Cannot decode notes composite row");
    check_composite_row!(&mut *trans, "note_content_revisions", {
        note_id: uuid::Uuid,
        revision: i64,
        operator_id: Option<uuid::Uuid>,
        title: String,
        text: String,
        entities: serde_json::Value,
        created: time::OffsetDateTime,
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
        created: time::OffsetDateTime,
        modified: time::OffsetDateTime,
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
        metadata_version: uuid::Uuid,
        created: time::OffsetDateTime,
        modified: time::OffsetDateTime,
        pos_p: i32,
        pos_q: i32,
        pos: f64,
        components_version: uuid::Uuid,
    })
    .expect("Cannot decode entries composite row");
    check_composite_row!(&mut *trans, "entry_effects", {
        id: uuid::Uuid,
        space_id: uuid::Uuid,
        scope_id: uuid::Uuid,
        operator_id: Option<uuid::Uuid>,
        created: time::OffsetDateTime,
        message_id: Option<uuid::Uuid>,
    })
    .expect("Cannot decode entry_effects composite row");
    check_composite_row!(&mut *trans, "entry_identifiers", {
        scope_id: uuid::Uuid,
        entry_id: uuid::Uuid,
        value: String,
        kind: IdentifierKind,
    })
    .expect("Cannot decode entry_identifiers composite row");
    check_composite_row!(&mut *trans, "entry_history", {
        entry_effect_id: uuid::Uuid,
        entry_id: uuid::Uuid,
        key: String,
        previous_key: Option<String>,
        action: EntryHistoryAction,
    })
    .expect("Cannot decode entry_history composite row");
    check_composite_row!(&mut *trans, "entry_components", {
        entry_id: uuid::Uuid,
        component_type: String,
        payload_type: EntryComponentPayloadType,
        version: uuid::Uuid,
        modified: time::OffsetDateTime,
    })
    .expect("Cannot decode entry_components composite row");
    check_composite_row!(&mut *trans, "entry_components_json", {
        entry_id: uuid::Uuid,
        component_type: String,
        payload_type: EntryComponentPayloadType,
        data: serde_json::Value,
        schema_version: i32,
    })
    .expect("Cannot decode entry_components_json composite row");
    check_composite_row!(&mut *trans, "entry_components_asset", {
        entry_id: uuid::Uuid,
        component_type: String,
        payload_type: EntryComponentPayloadType,
        scope_id: uuid::Uuid,
        space_id: uuid::Uuid,
        asset_id: uuid::Uuid,
    })
    .expect("Cannot decode entry_components_asset composite row");
    check_composite_row!(&mut *trans, "entry_component_history", {
        entry_effect_id: uuid::Uuid,
        entry_id: uuid::Uuid,
        key: String,
        component_type: String,
        action: EntryComponentHistoryAction,
        payload: Option<serde_json::Value>,
    })
    .expect("Cannot decode entry_component_history composite row");

    if let Some(real_user_id) = real_user_id {
        let _session = crate::session::start(pool, real_user_id)
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

    #[sqlx::test(
        migrator = "super::MIGRATOR",
        fixtures(
            path = "../fixtures",
            scripts("0-users", "1-spaces-and-channels", "2-member")
        )
    )]
    async fn db_test_all_fixtures(pool: sqlx::PgPool) {
        let space_scope_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM scopes WHERE kind = 'Space'")
                .fetch_one(&pool)
                .await
                .expect("failed to count fixture space scopes");

        assert_eq!(space_scope_count, 3);
    }
}
