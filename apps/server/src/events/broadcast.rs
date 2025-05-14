use std::{
    sync::{Arc, OnceLock},
    time::Duration,
};

use uuid::Uuid;

use super::context::EncodedUpdate;

pub type EventSender = tokio::sync::broadcast::Sender<Arc<EncodedUpdate>>;

type BroadcastTable = papaya::HashMap<Uuid, EventSender, ahash::RandomState>;

static BROADCAST_TABLE: OnceLock<BroadcastTable> = OnceLock::new();

pub fn get_broadcast_table() -> &'static BroadcastTable {
    let cleanup: parking_lot::Once = parking_lot::Once::new();

    let table = BROADCAST_TABLE.get_or_init(|| {
        papaya::HashMap::builder()
            .capacity(4096)
            .hasher(ahash::RandomState::new())
            .resize_mode(papaya::ResizeMode::Blocking)
            .build()
    });
    cleanup.call_once(|| {
        tokio::spawn(async {
            let mut interval = tokio::time::interval(Duration::from_secs(5 * 60));
            loop {
                tokio::select! {
                    _ = crate::shutdown::SHUTDOWN.notified() => {
                        break;
                    }
                    _ = interval.tick() => {
                        broadcast_clean().await;
                    }
                }
            }
        });
    });
    table
}

async fn broadcast_clean() {
    let mut broadcast_table = BROADCAST_TABLE.wait().pin();
    let before_count = broadcast_table.len();
    broadcast_table.retain(|_, v| v.receiver_count() != 0);
    log::info!(
        "Finish broadcast clean, {} -> {}",
        before_count,
        broadcast_table.len()
    );
}

pub fn get_mailbox_broadcast_rx(id: Uuid) -> tokio::sync::broadcast::Receiver<Arc<EncodedUpdate>> {
    let broadcast_table = get_broadcast_table();
    let table = broadcast_table.pin();
    table
        .get_or_insert_with(id, || {
            let capacity = 256;
            let (tx, _) = tokio::sync::broadcast::channel(capacity);
            tx
        })
        .subscribe()
}
