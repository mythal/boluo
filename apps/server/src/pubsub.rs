use std::{borrow::Cow, sync::OnceLock};

use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

fn node_id() -> &'static str {
    NODE_ID.get().map(String::as_str).unwrap_or("unknown")
}

static NODE_ID: OnceLock<String> = OnceLock::new();

pub fn initialize_node_id(node_id: &str) {
    if NODE_ID.set(node_id.to_owned()).is_err() {
        tracing::warn!(
            event = "pubsub.node_id_already_initialized",
            "PubSub node ID was already initialized"
        );
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub enum PubSubMessage {
    Invalidation {
        key: Uuid,
        topic: Cow<'static, str>,
        /// Node ID
        #[serde(default)]
        node: Cow<'static, str>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        metadata: Option<Cow<'static, str>>,
        /// Timestamp in milliseconds
        ts: i64,
    },
}

impl PubSubMessage {
    pub fn invalidate(topic: Cow<'static, str>, key: Uuid) -> Self {
        let now = OffsetDateTime::now_utc();
        PubSubMessage::Invalidation {
            topic,
            key,
            node: node_id().into(),
            metadata: None,
            ts: now.unix_timestamp_nanos() as i64 / 1_000_000,
        }
    }
}
