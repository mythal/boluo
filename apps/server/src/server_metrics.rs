use metrics::gauge;
use std::time::Instant;

#[derive(Debug, PartialEq, Eq)]
struct ProcessMemorySnapshot {
    rss_bytes: u64,
    anonymous_bytes: u64,
    file_bytes: u64,
    shared_bytes: u64,
    swap_bytes: u64,
    threads: u64,
}

#[cfg(target_os = "linux")]
fn parse_status_value(status: &str, key: &str) -> Option<u64> {
    let line = status.lines().find(|line| line.starts_with(key))?;
    let mut fields = line[key.len()..].split_whitespace();
    let value = fields.next()?.parse::<u64>().ok()?;
    match fields.next() {
        Some("kB") => value.checked_mul(1024),
        None => Some(value),
        Some(_) => None,
    }
}

#[cfg(target_os = "linux")]
fn get_process_memory_snapshot() -> Option<ProcessMemorySnapshot> {
    let status = std::fs::read_to_string("/proc/self/status").ok()?;
    Some(ProcessMemorySnapshot {
        rss_bytes: parse_status_value(&status, "VmRSS:")?,
        anonymous_bytes: parse_status_value(&status, "RssAnon:")?,
        file_bytes: parse_status_value(&status, "RssFile:")?,
        shared_bytes: parse_status_value(&status, "RssShmem:")?,
        swap_bytes: parse_status_value(&status, "VmSwap:")?,
        threads: parse_status_value(&status, "Threads:")?,
    })
}

#[cfg(not(target_os = "linux"))]
fn get_process_memory_snapshot() -> Option<ProcessMemorySnapshot> {
    None
}

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

pub async fn update_process_memory_metrics() {
    let Some(snapshot) = tokio::task::spawn_blocking(get_process_memory_snapshot)
        .await
        .ok()
        .flatten()
    else {
        return;
    };
    gauge!("boluo_server_process_memory_bytes", "kind" => "rss").set(snapshot.rss_bytes as f64);
    gauge!("boluo_server_process_memory_bytes", "kind" => "anonymous")
        .set(snapshot.anonymous_bytes as f64);
    gauge!("boluo_server_process_memory_bytes", "kind" => "file").set(snapshot.file_bytes as f64);
    gauge!("boluo_server_process_memory_bytes", "kind" => "shared")
        .set(snapshot.shared_bytes as f64);
    gauge!("boluo_server_process_swap_bytes").set(snapshot.swap_bytes as f64);
    gauge!("boluo_server_process_threads").set(snapshot.threads as f64);
}

pub fn update_allocator_metrics() {
    let mut elapsed_msecs = 0;
    let mut user_msecs = 0;
    let mut system_msecs = 0;
    let mut current_rss = 0;
    let mut peak_rss = 0;
    let mut current_commit = 0;
    let mut peak_commit = 0;
    let mut page_faults = 0;
    // SAFETY: All pointers refer to valid stack-allocated `usize` values for the duration of the
    // call. `mi_process_info` only writes the process-wide allocator statistics to them.
    unsafe {
        libmimalloc_sys::mi_process_info(
            &mut elapsed_msecs,
            &mut user_msecs,
            &mut system_msecs,
            &mut current_rss,
            &mut peak_rss,
            &mut current_commit,
            &mut peak_commit,
            &mut page_faults,
        );
    }
    gauge!("boluo_server_allocator_resident_memory_bytes").set(current_rss as f64);
    gauge!("boluo_server_allocator_peak_resident_memory_bytes").set(peak_rss as f64);
    gauge!("boluo_server_allocator_committed_bytes").set(current_commit as f64);
    gauge!("boluo_server_allocator_peak_committed_bytes").set(peak_commit as f64);
    metrics::counter!("boluo_server_allocator_page_faults_total").absolute(page_faults as u64);
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
            tracing::warn!(
                event = "health.database_probe.failed",
                "Database health metrics probe failed: {}",
                err
            );
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
            tracing::warn!(
                event = "health.redis_probe.invalid_response",
                "Redis health metrics probe returned unexpected response: {response}"
            );
            gauge!("boluo_server_redis_up").set(0.0);
            gauge!("boluo_server_redis_probe_rtt_ms").set(0.0);
        }
        Err(err) => {
            tracing::warn!(
                event = "health.redis_probe.failed",
                "Redis health metrics probe failed: {}",
                err
            );
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
                    update_process_memory_metrics().await;
                    update_allocator_metrics();
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

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "linux")]
    #[test]
    fn parses_linux_process_status_memory() {
        let status = "\
VmRSS:\t  1234 kB\n\
RssAnon:\t   900 kB\n\
RssFile:\t   300 kB\n\
RssShmem:\t    34 kB\n\
VmSwap:\t    12 kB\n\
Threads:\t7\n";

        assert_eq!(parse_status_value(status, "VmRSS:"), Some(1234 * 1024));
        assert_eq!(parse_status_value(status, "Threads:"), Some(7));
        assert_eq!(parse_status_value(status, "VmPeak:"), None);
    }
}
