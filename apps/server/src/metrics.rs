use metrics::{counter, gauge};

pub fn websocket_connection_established() {
    gauge!("boluo_server_websocket_connections_active").increment(1);
    counter!("boluo_server_websocket_connections_total").increment(1);
}

pub fn websocket_connection_closed() {
    gauge!("boluo_server_websocket_connections_active").decrement(1);
}

pub fn tcp_connection_established() {
    gauge!("boluo_server_tcp_connections_active").increment(1);
    counter!("boluo_server_tcp_connections_total").increment(1);
}

pub fn tcp_connection_closed() {
    gauge!("boluo_server_tcp_connections_active").decrement(1);
}

pub fn get_current_file_descriptors() -> u64 {
    #[cfg(unix)]
    {
        match std::fs::read_dir("/proc/self/fd") {
            Ok(entries) => entries.count() as u64,
            Err(e) => {
                tracing::warn!("Failed to read file descriptors: {}", e);
                0
            }
        }
    }
    #[cfg(not(unix))]
    {
        tracing::warn!("File descriptor monitoring not supported on this platform");
        0
    }
}

pub fn update_file_descriptor_metrics() {
    let fd_count = get_current_file_descriptors();
    gauge!("boluo_server_file_descriptors_used").set(fd_count as f64);

    tracing::trace!(
        file_descriptors = fd_count,
        "File descriptor metrics updated"
    );
}

pub fn update_db_pool_metrics(pool: &sqlx::Pool<sqlx::Postgres>) {
    let active_connections = pool.size() as f64;
    let idle_connections = pool.num_idle() as f64;

    gauge!("boluo_server_db_pool_connections_active").set(active_connections);
    gauge!("boluo_server_db_pool_connections_idle").set(idle_connections);
    gauge!("boluo_server_db_pool_connections_total").set(active_connections);

    tracing::trace!(
        active_connections = active_connections,
        idle_connections = idle_connections,
        "Database pool metrics updated"
    );
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

pub fn db_connection_acquired() {
    counter!("boluo_server_db_connections_acquired_total").increment(1);
    tracing::trace!("Database connection acquired");
}

pub fn db_connection_released() {
    counter!("boluo_server_db_connections_released_total").increment(1);
    tracing::trace!("Database connection released");
}

pub fn init_metrics() {
    gauge!("boluo_server_websocket_connections_active").set(0.0);
    counter!("boluo_server_websocket_connections_total").absolute(0);
    gauge!("boluo_server_tcp_connections_active").set(0.0);
    counter!("boluo_server_tcp_connections_total").absolute(0);

    gauge!("boluo_server_db_pool_connections_active").set(0.0);
    gauge!("boluo_server_db_pool_connections_idle").set(0.0);
    gauge!("boluo_server_db_pool_connections_total").set(0.0);
    counter!("boluo_server_db_connections_acquired_total").absolute(0);
    counter!("boluo_server_db_connections_released_total").absolute(0);
    counter!("boluo_server_db_queries_total").absolute(0);

    gauge!("boluo_server_file_descriptors_used").set(0.0);

    tracing::info!("Metrics initialized");
}
