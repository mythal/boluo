use std::{sync::OnceLock, time::Duration};

use tokio_tungstenite::tungstenite::Utf8Bytes;
use tracing::Instrument as _;
use uuid::Uuid;

pub type EventSender = tokio::sync::broadcast::Sender<Utf8Bytes>;

type BroadcastTable = papaya::HashMap<Uuid, EventSender, ahash::RandomState>;

static BROADCAST_TABLE: OnceLock<BroadcastTable> = OnceLock::new();

pub fn get_broadcast_table() -> &'static BroadcastTable {
    static CLEANUP: parking_lot::Once = parking_lot::Once::new();

    let table = BROADCAST_TABLE.get_or_init(|| {
        papaya::HashMap::builder()
            .capacity(4096)
            .hasher(ahash::RandomState::new())
            .resize_mode(papaya::ResizeMode::Blocking)
            .build()
    });
    CLEANUP.call_once(|| {
        let span = tracing::info_span!(parent: None, "broadcast_clean");
        tokio::spawn(
            async {
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
            }
            .instrument(span),
        );
    });
    table
}

async fn broadcast_clean() {
    let mut broadcast_table = BROADCAST_TABLE.wait().pin();
    let before_count = broadcast_table.len();
    broadcast_table.retain(|_, v| v.receiver_count() != 0);
    tracing::info!(
        "Finish broadcast clean, {} -> {}",
        before_count,
        broadcast_table.len()
    );
}

pub fn get_mailbox_broadcast_rx(id: Uuid) -> tokio::sync::broadcast::Receiver<Utf8Bytes> {
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
