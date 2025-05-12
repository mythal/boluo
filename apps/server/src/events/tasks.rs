use crate::events::context::get_broadcast_table;
use futures::StreamExt;
use std::time::Duration;
use tokio::time::interval;
use tokio_stream::wrappers::IntervalStream;

pub fn start() {
    tokio::spawn(broadcast_clean());
    tokio::spawn(super::handlers::token_clean());
}

async fn broadcast_clean() {
    IntervalStream::new(interval(Duration::from_secs(5 * 60)))
        .for_each(|_| async {
            let mut broadcast_table = get_broadcast_table().pin();
            let before_count = broadcast_table.len();
            broadcast_table.retain(|_, v| v.receiver_count() != 0);
            log::info!(
                "finish broadcast clean, {} -> {}",
                before_count,
                broadcast_table.len()
            );
        })
        .await;
}
