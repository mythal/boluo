use metrics::{counter, gauge};
use std::sync::atomic::{AtomicU64, Ordering};

static WEBSOCKET_CONNECTIONS: AtomicU64 = AtomicU64::new(0);
static TCP_CONNECTIONS: AtomicU64 = AtomicU64::new(0);

pub fn websocket_connection_established() {
    let count = WEBSOCKET_CONNECTIONS.fetch_add(1, Ordering::Relaxed) + 1;
    gauge!("websocket_connections_active").set(count as f64);
    counter!("websocket_connections_total").increment(1);

    tracing::debug!(
        current_connections = count,
        "WebSocket connection established"
    );
}

pub fn websocket_connection_closed() {
    let count = WEBSOCKET_CONNECTIONS
        .fetch_sub(1, Ordering::Relaxed)
        .saturating_sub(1);
    gauge!("websocket_connections_active").set(count as f64);

    tracing::debug!(current_connections = count, "WebSocket connection closed");
}

pub fn get_current_websocket_connections() -> u64 {
    WEBSOCKET_CONNECTIONS.load(Ordering::Relaxed)
}

pub fn tcp_connection_established() {
    let count = TCP_CONNECTIONS.fetch_add(1, Ordering::Relaxed) + 1;
    gauge!("tcp_connections_active").set(count as f64);
    counter!("tcp_connections_total").increment(1);

    tracing::trace!(current_connections = count, "TCP connection established");
}

pub fn tcp_connection_closed() {
    let count = TCP_CONNECTIONS
        .fetch_sub(1, Ordering::Relaxed)
        .saturating_sub(1);
    gauge!("tcp_connections_active").set(count as f64);

    tracing::trace!(current_connections = count, "TCP connection closed");
}

pub fn get_current_tcp_connections() -> u64 {
    TCP_CONNECTIONS.load(Ordering::Relaxed)
}

pub fn update_db_pool_metrics(pool: &sqlx::Pool<sqlx::Postgres>) {
    let active_connections = pool.size() as f64;
    let idle_connections = pool.num_idle() as f64;

    gauge!("db_pool_connections_active").set(active_connections);
    gauge!("db_pool_connections_idle").set(idle_connections);
    gauge!("db_pool_connections_total").set(active_connections);

    tracing::trace!(
        active_connections = active_connections,
        idle_connections = idle_connections,
        "Database pool metrics updated"
    );
}

pub fn db_connection_acquired() {
    counter!("db_connections_acquired_total").increment(1);
    tracing::trace!("Database connection acquired");
}

pub fn db_connection_released() {
    counter!("db_connections_released_total").increment(1);
    tracing::trace!("Database connection released");
}

pub fn db_query_executed(query_type: &str) {
    counter!("db_queries_total").increment(1);
    counter!("db_queries_by_type_total", "type" => query_type).increment(1);
}

pub fn init_metrics() {
    gauge!("websocket_connections_active").set(0.0);
    counter!("websocket_connections_total").absolute(0);
    gauge!("tcp_connections_active").set(0.0);
    counter!("tcp_connections_total").absolute(0);

    gauge!("db_pool_connections_active").set(0.0);
    gauge!("db_pool_connections_idle").set(0.0);
    gauge!("db_pool_connections_total").set(0.0);
    counter!("db_connections_acquired_total").absolute(0);
    counter!("db_connections_released_total").absolute(0);
    counter!("db_queries_total").absolute(0);

    tracing::info!("Metrics initialized");
}
