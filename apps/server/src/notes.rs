mod api;
pub(crate) mod handlers;
mod models;

pub use handlers::router;
pub use models::{Note, NoteContentRevision, NoteMetadata};
