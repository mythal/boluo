use std::{collections::HashMap, sync::LazyLock};

use chrono::{DateTime, Utc};
use tracing::Instrument as _;
use uuid::Uuid;

use crate::db;
use crate::space_runtime::SpaceStore;

async fn persist_space_activity(
    pool: &sqlx::PgPool,
    space_id: Uuid,
    update_time: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    sqlx::query_file!("sql/spaces/set_latest_activity.sql", space_id, update_time)
        .execute(pool)
        .await?;
    Ok(())
}

#[cfg(test)]
async fn apply_space_activity(
    pool: &sqlx::PgPool,
    space_store: &SpaceStore,
    space_id: Uuid,
    update_time: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    space_store.record_latest_activity_if_loaded(space_id, update_time);
    persist_space_activity(pool, space_id, update_time).await
}

static NOTIFY_SPACE_ACTIVITY: LazyLock<tokio::sync::mpsc::Sender<(Uuid, DateTime<Utc>)>> =
    LazyLock::new(|| {
        let (tx, mut rx) = tokio::sync::mpsc::channel::<(Uuid, DateTime<Utc>)>(64);
        let span = tracing::info_span!(parent: None, "space_activity");
        tokio::spawn(async move {
            let mut map: HashMap<Uuid, DateTime<Utc>, _> =
                HashMap::with_hasher(ahash::RandomState::new());

            let pool = db::get().await;
            let mut interval = crate::utils::cleaner_interval(6);
            loop {
                tokio::select! {
                    Some((space_id, update_time)) = rx.recv() => {
                        map.entry(space_id)
                            .and_modify(|current| *current = (*current).max(update_time))
                            .or_insert(update_time);
                    }
                    _ = crate::shutdown::SHUTDOWN.notified() => {
                        break;
                    }
                    _ = interval.tick() => {
                        if !map.is_empty() {
                            let mut taken_map = HashMap::with_capacity_and_hasher(map.len(), ahash::RandomState::new());
                            std::mem::swap(&mut map, &mut taken_map);
                            // Update the database with the latest activity.
                            for (space_id, update_time) in taken_map {
                                if let Err(err) =
                                    persist_space_activity(&pool, space_id, update_time).await
                                {
                                    tracing::error!(error = %err, %space_id, "Failed to update Space activity");
                                };
                            }
                        }
                    }

                    else => {
                        tracing::warn!("Channel closed, exiting space activity task");
                        break;
                    }
                }
            }
        }.instrument(span));
        tx
    });

pub(crate) fn space_activity(
    space_store: &SpaceStore,
    space_id: Uuid,
    update_time: Option<DateTime<Utc>>,
) {
    let update_time = update_time.unwrap_or_else(Utc::now);
    space_store.record_latest_activity_if_loaded(space_id, update_time);
    let tx = NOTIFY_SPACE_ACTIVITY.clone();
    if let Err(_err) = tx.try_send((space_id, update_time)) {
        tracing::info!(
            "Failed to send space activity notification: {}, tokio channel is full",
            space_id
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context::AppContext;
    use crate::spaces::Space;
    use crate::users::User;

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_space_activity_updates_loaded_runtime(pool: sqlx::PgPool) {
        let suffix = Uuid::new_v4().simple().to_string();
        let owner = User::register(
            &pool,
            &format!("activity_{}@example.com", &suffix[..8]),
            &format!("activity_{}", &suffix[..8]),
            "Activity Tester",
            "ActivityPass123!",
        )
        .await
        .expect("failed to create activity test user");
        let space = Space::create(
            &pool,
            format!("activity_{}", &suffix[..8]),
            &owner.id,
            "Activity test Space".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("failed to create activity test Space");
        let ctx = AppContext::new(pool.clone(), None);
        let runtime = ctx
            .space_store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");
        let update_time = space.latest_activity + chrono::Duration::seconds(30);

        apply_space_activity(&pool, &ctx.space_store, space.id, update_time)
            .await
            .expect("failed to apply Space activity");

        let from_database = Space::get_by_id(&pool, &space.id)
            .await
            .expect("failed to query updated Space")
            .expect("updated Space disappeared");
        assert_eq!(from_database.latest_activity, update_time);
        assert_eq!(
            runtime
                .authoritative_snapshot()
                .expect("Space runtime became dirty")
                .space()
                .latest_activity,
            update_time,
            "the loaded Space runtime remained authoritative with stale activity"
        );

        let pending_write_time = update_time + chrono::Duration::seconds(30);
        ctx.space_store
            .record_latest_activity_if_loaded(space.id, pending_write_time);
        ctx.space_store
            .refresh_if_loaded(space.id)
            .await
            .expect("failed to refresh loaded Space runtime")
            .expect("loaded Space runtime disappeared");
        assert_eq!(
            runtime
                .authoritative_snapshot()
                .expect("Space runtime remained dirty")
                .space()
                .latest_activity,
            pending_write_time,
            "a structural refresh regressed activity before its batched database write"
        );
    }
}
