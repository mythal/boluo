use metrics::{counter, gauge};

pub fn get_current_file_descriptors() -> u64 {
    #[cfg(target_os = "linux")]
    {
        match std::fs::read_dir("/proc/self/fd") {
            Ok(entries) => entries.count() as u64,
            Err(e) => {
                tracing::debug!("Failed to read file descriptors: {}", e);
                0
            }
        }
    }
    #[cfg(not(target_os = "linux"))]
    {
        0
    }
}

pub fn update_file_descriptor_metrics() {
    let fd_count = get_current_file_descriptors();
    gauge!("boluo_server_file_descriptors_used").set(fd_count as f64);
}

pub fn update_db_pool_metrics(pool: &sqlx::Pool<sqlx::Postgres>) {
    gauge!("boluo_server_db_pool_connections_idle").set(pool.num_idle() as f64);
    gauge!("boluo_server_db_pool_connections_total").set(pool.size() as f64);
}

pub fn start_update_metrics() {
    tokio::task::spawn(async {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(4));
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    update_file_descriptor_metrics();
                    update_db_pool_metrics(&crate::db::get().await);
                }
                _ = crate::shutdown::SHUTDOWN.notified() => {
                    break;
                }
            }
        }
    });
}

pub async fn init_metrics() {
    let pool = crate::db::get().await;
    let mut conn = pool
        .acquire()
        .await
        .expect("Failed to acquire database connection for metrics initialization");
    let total_users_count = sqlx::query_scalar!("SELECT COUNT(*) FROM users")
        .fetch_one(&mut *conn)
        .await
        .expect("Failed to get total users count")
        .unwrap_or(0);
    counter!("boluo_server_users_total").absolute(total_users_count as u64);
    tracing::info!("Metrics initialized");
}
