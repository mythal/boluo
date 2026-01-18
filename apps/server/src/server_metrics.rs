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

pub async fn update_file_descriptor_metrics() {
    let fd_count = tokio::task::spawn_blocking(get_current_file_descriptors)
        .await
        .unwrap_or(0);
    gauge!("boluo_server_file_descriptors_used").set(fd_count as f64);
}

pub fn update_db_pool_metrics(pool: &sqlx::PgPool) {
    gauge!("boluo_server_db_pool_connections_idle").set(pool.num_idle() as f64);
    gauge!("boluo_server_db_pool_connections_total").set(pool.size() as f64);
}

pub fn update_runtime_metrics() {
    gauge!("boluo_server_events_mailboxes").set(crate::events::context::mailbox_count() as f64);
    gauge!("boluo_server_events_broadcast_mailboxes")
        .set(crate::events::broadcast_table_len() as f64);
    gauge!("boluo_server_events_token_store_entries").set(crate::events::token_store_len() as f64);
    gauge!("boluo_server_pos_actors").set(crate::pos::CHANNEL_POS_MANAGER.actor_count() as f64);
}

pub fn start_update_metrics(pool: sqlx::PgPool) {
    tokio::task::spawn(async move {
        let mut interval_4s = crate::utils::cleaner_interval(4);
        let mut interval_8s = crate::utils::cleaner_interval(8);
        let mut interval_30s = crate::utils::cleaner_interval(30);
        loop {
            tokio::select! {
                _ = interval_4s.tick() => {
                    update_file_descriptor_metrics().await;
                    update_db_pool_metrics(&pool);
                }
                _ = interval_8s.tick() => {
                    if let Ok(Err(e)) = tokio::task::spawn_blocking(update_network_metrics).await {
                        tracing::error!("Failed to update network metrics: {}", e);
                    }
                }
                _ = interval_30s.tick() => {
                    update_runtime_metrics();
                }
                _ = crate::shutdown::SHUTDOWN.notified() => {
                    break;
                }
            }
        }
    });
}

pub fn update_network_metrics() -> Result<(), anyhow::Error> {
    use netstat2::{AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo, TcpState};
    let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let proto_flags = ProtocolFlags::TCP;
    let mut close_wait_counter = 0;
    let mut listen_counter = 0;
    let mut syn_recv_counter = 0;
    let mut syn_sent_counter = 0;
    let mut established_counter = 0;
    let mut fin_wait_1_counter = 0;
    let mut fin_wait_2_counter = 0;
    let mut closed_counter = 0;
    let mut closing_counter = 0;
    let mut last_ack_counter = 0;
    let mut time_wait_counter = 0;

    for socket_info in netstat2::iterate_sockets_info(af_flags, proto_flags)? {
        let Ok(socket_info) = socket_info else {
            continue;
        };
        match socket_info.protocol_socket_info {
            ProtocolSocketInfo::Tcp(tcp_socket_info) => match tcp_socket_info.state {
                TcpState::TimeWait => time_wait_counter += 1,
                TcpState::CloseWait => close_wait_counter += 1,
                TcpState::SynReceived => syn_recv_counter += 1,
                TcpState::SynSent => syn_sent_counter += 1,
                TcpState::Established => established_counter += 1,
                TcpState::Closing => closing_counter += 1,
                TcpState::Listen => listen_counter += 1,
                TcpState::Closed => closed_counter += 1,
                TcpState::FinWait1 => fin_wait_1_counter += 1,
                TcpState::FinWait2 => fin_wait_2_counter += 1,
                TcpState::LastAck => last_ack_counter += 1,
                _ => {}
            },
            ProtocolSocketInfo::Udp(_) => {
                // Pass
            }
        }
    }
    gauge!("boluo_server_tcp_connections_time_wait").set(time_wait_counter as f64);
    gauge!("boluo_server_tcp_connections_close_wait").set(close_wait_counter as f64);
    gauge!("boluo_server_tcp_connections_syn_recv").set(syn_recv_counter as f64);
    gauge!("boluo_server_tcp_connections_syn_sent").set(syn_sent_counter as f64);
    gauge!("boluo_server_tcp_connections_established").set(established_counter as f64);
    gauge!("boluo_server_tcp_connections_closing").set(closing_counter as f64);
    gauge!("boluo_server_tcp_connections_listen").set(listen_counter as f64);
    gauge!("boluo_server_tcp_connections_closed").set(closed_counter as f64);
    gauge!("boluo_server_tcp_connections_fin_wait_1").set(fin_wait_1_counter as f64);
    gauge!("boluo_server_tcp_connections_fin_wait_2").set(fin_wait_2_counter as f64);
    gauge!("boluo_server_tcp_connections_last_ack").set(last_ack_counter as f64);

    Ok(())
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
    counter!("boluo_server_users_total").absolute(total_users_count as u64);
    tracing::info!("Metrics initialized");
}
