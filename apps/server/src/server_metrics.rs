use metrics::gauge;
use std::time::Instant;

fn get_file_descriptor_snapshot() -> (u64, Option<u64>) {
    #[cfg(target_os = "linux")]
    {
        let used = match std::fs::read_dir("/proc/self/fd") {
            Ok(entries) => entries.count() as u64,
            Err(e) => {
                tracing::debug!("Failed to read file descriptors: {}", e);
                return (0, None);
            }
        };
        let limit = std::fs::read_to_string("/proc/self/limits")
            .ok()
            .and_then(|limits| {
                limits
                    .lines()
                    .find(|line| line.starts_with("Max open files"))
                    .and_then(|line| line.split_whitespace().nth(3))
                    .and_then(|value| value.parse::<u64>().ok())
            });
        (used, limit)
    }
    #[cfg(not(target_os = "linux"))]
    {
        (0, None)
    }
}

pub async fn update_file_descriptor_metrics() {
    let (fd_count, fd_limit) = tokio::task::spawn_blocking(get_file_descriptor_snapshot)
        .await
        .unwrap_or((0, None));
    gauge!("boluo_server_file_descriptors_used").set(fd_count as f64);
    if let Some(fd_limit) = fd_limit.filter(|limit| *limit > 0) {
        gauge!("boluo_server_file_descriptors_limit").set(fd_limit as f64);
        gauge!("boluo_server_file_descriptors_ratio").set(fd_count as f64 / fd_limit as f64);
    }
}

pub fn update_db_pool_metrics(pool: &sqlx::PgPool) {
    let total = pool.size() as f64;
    let idle = pool.num_idle() as f64;
    let max = pool.options().get_max_connections() as f64;
    gauge!("boluo_server_db_pool_connections_idle").set(idle);
    gauge!("boluo_server_db_pool_connections_total").set(total);
    gauge!("boluo_server_db_pool_connections_max").set(max);
    gauge!("boluo_server_db_pool_connections_utilization").set((total - idle) / max.max(1.0));
    gauge!("boluo_server_db_pool_saturated").set((total >= max && idle == 0.0) as u8 as f64);
}

pub async fn update_database_health_metrics(pool: &sqlx::PgPool) {
    let start = Instant::now();
    let acquire_start = Instant::now();
    let acquire_result = pool.acquire().await;
    metrics::histogram!("boluo_server_db_pool_probe_acquire_duration_seconds")
        .record(acquire_start.elapsed().as_secs_f64());
    let result = async {
        let mut conn = acquire_result
            .map_err(|err| anyhow::anyhow!("failed to acquire database connection: {err:?}"))?;
        let record = sqlx::query!("SELECT 42 as x;")
            .fetch_one(&mut *conn)
            .await
            .map_err(|err| anyhow::anyhow!("failed to query database: {err:?}"))?;
        if record.x != Some(42) {
            anyhow::bail!("database probe returned an unexpected value");
        }
        anyhow::Ok(())
    }
    .await;
    match result {
        Ok(()) => {
            metrics::counter!("boluo_server_db_pool_probe_total", "result" => "success")
                .increment(1);
            gauge!("boluo_server_database_up").set(1.0);
            gauge!("boluo_server_database_probe_rtt_ms").set(start.elapsed().as_millis() as f64);
        }
        Err(err) => {
            metrics::counter!("boluo_server_db_pool_probe_total", "result" => "error").increment(1);
            tracing::warn!("Database health metrics probe failed: {}", err);
            gauge!("boluo_server_database_up").set(0.0);
            gauge!("boluo_server_database_probe_rtt_ms").set(0.0);
        }
    }
}

pub async fn update_redis_health_metrics(conn: Option<redis::aio::ConnectionManager>) {
    let Some(mut conn) = conn else {
        gauge!("boluo_server_redis_up").set(0.0);
        gauge!("boluo_server_redis_probe_rtt_ms").set(0.0);
        return;
    };

    let start = Instant::now();
    let result = redis::cmd("PING").query_async::<String>(&mut conn).await;
    match result {
        Ok(response) if response == "PONG" => {
            gauge!("boluo_server_redis_up").set(1.0);
            gauge!("boluo_server_redis_probe_rtt_ms").set(start.elapsed().as_millis() as f64);
        }
        Ok(response) => {
            tracing::warn!("Redis health metrics probe returned unexpected response: {response}");
            gauge!("boluo_server_redis_up").set(0.0);
            gauge!("boluo_server_redis_probe_rtt_ms").set(0.0);
        }
        Err(err) => {
            tracing::warn!("Redis health metrics probe failed: {}", err);
            gauge!("boluo_server_redis_up").set(0.0);
            gauge!("boluo_server_redis_probe_rtt_ms").set(0.0);
        }
    }
}

pub fn update_runtime_metrics(space_store: &crate::space_runtime::SpaceStore) {
    gauge!("boluo_server_events_mailboxes").set(crate::events::context::mailbox_count() as f64);
    gauge!("boluo_server_events_broadcast_mailboxes")
        .set(crate::events::broadcast_table_len() as f64);
    gauge!("boluo_server_events_mailbox_action_queue_depth")
        .set(crate::events::context::mailbox_action_queue_depth() as f64);
    gauge!("boluo_server_events_token_store_entries").set(crate::events::token_store_len() as f64);
    gauge!("boluo_server_pos_actors").set(crate::messages::MESSAGE_POSITIONS.actor_count() as f64);
    space_store.update_metrics();
}

pub fn start_update_metrics(
    pool: sqlx::PgPool,
    redis: Option<redis::aio::ConnectionManager>,
    space_store: crate::space_runtime::SpaceStore,
) {
    tokio::task::spawn(async move {
        let mut interval_4s = crate::utils::cleaner_interval(4);
        let mut interval_30s = crate::utils::cleaner_interval(30);
        loop {
            tokio::select! {
                _ = interval_4s.tick() => {
                    update_file_descriptor_metrics().await;
                    update_db_pool_metrics(&pool);
                    update_database_health_metrics(&pool).await;
                    update_redis_health_metrics(redis.clone()).await;
                }
                _ = interval_30s.tick() => {
                    update_runtime_metrics(&space_store);
                }
                _ = crate::shutdown::SHUTDOWN.notified() => {
                    break;
                }
            }
        }
    });
}

pub async fn init_metrics(pool: &sqlx::Pool<sqlx::Postgres>) {
    let mut conn = pool
        .acquire()
        .await
        .expect("Failed to acquire database connection for metrics initialization");
    let total_users_count = sqlx::query_scalar!("SELECT COUNT(*) FROM users")
        .fetch_one(&mut *conn)
        .await
        .expect("Failed to get total users count")
        .unwrap_or(0);
    gauge!("boluo_server_users_current").set(total_users_count as f64);
    tracing::info!("Metrics initialized");
}
