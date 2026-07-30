pub mod api;
pub(crate) mod handlers;
mod models;

pub use handlers::router;
pub use models::Character;
pub(crate) use models::{normalize_aliases, normalize_ident};
