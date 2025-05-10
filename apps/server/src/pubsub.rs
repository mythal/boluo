use std::{borrow::Cow, sync::OnceLock};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

fn node_id() -> &'static str {
    static NODE_ID: OnceLock<&'static str> = OnceLock::new();
    NODE_ID.get_or_init(|| {
        let fly_machine_id = std::env::var("FLY_MACHINE_ID").unwrap_or_else(|_| "None".to_string());
        Box::leak(fly_machine_id.into_boxed_str())
    })
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
        let now = chrono::Utc::now();
        PubSubMessage::Invalidation {
            topic,
            key,
            node: node_id().into(),
            metadata: None,
            ts: now.timestamp_millis(),
        }
    }
}
