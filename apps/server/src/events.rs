mod api;
mod broadcast;
pub mod context;
mod handlers;
pub mod models;
pub mod preview;
mod status;
mod token;
mod types;

pub use broadcast::{broadcast_table_len, get_broadcast_table, get_mailbox_broadcast_rx};
pub use handlers::router;
pub use status::StatusMap;
pub use types::{Update, startup_id};

pub fn token_store_len() -> usize {
    token::TOKEN_STORE.len()
}
