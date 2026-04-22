use std::sync::LazyLock;

use quick_cache::sync::Cache;
use uuid::Uuid;

use crate::channels::{Channel, ChannelMembers, SpacesChannels};
use crate::characters::{Character, CharacterVariables};
use crate::session::Session;
use crate::spaces::{Space, SpaceSettings, UserSpaces};
use crate::users::User;
use crate::users::UserExt;

trait GetCacheType {
    fn tag() -> CacheType;
}

pub struct CacheStats {
    name: &'static str,
    items: usize,
    hits: u64,
    misses: u64,
}

macro_rules! define_caches {
    ($(($type:ident, $capacity: expr)),* $(,)?) => {
        #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
        pub enum CacheType {
            $($type),*
        }

        impl CacheType {
            pub fn to_str(self) -> &'static str {
                match self {
                    $(
                        CacheType::$type => stringify!($type),
                    )*
                }
            }

            pub fn from_str(s: &str) -> Option<Self> {
                match s {
                    $(
                        stringify!($type) => Some(CacheType::$type),
                    )*
                    _ => None,
                }
            }
        }

        $(
            impl GetCacheType for $type {
                fn tag() -> CacheType {
                    CacheType::$type
                }
            }
        )*

        #[allow(non_snake_case)]
        pub struct CacheStore {
            $(
                pub $type: Cache<Uuid, crate::ttl::Mortal<$type>>,
            )*
        }

        impl CacheStore {
            fn new() -> Self {
                CacheStore {
                    $(
                        $type: Cache::new($capacity),
                    )*
                }
            }

            pub async fn invalidate(&self, cache_type: CacheType, key: Uuid) {
                match cache_type {
                    $(
                        CacheType::$type => {
                            self.$type.remove(&key);
                        }
                    )*
                }
                self.notify_invalidate(cache_type, key).await;
            }

            fn expiry(&self) {
                let mut total_before = 0;
                let mut total_after = 0;

                $(
                    total_before += self.$type.len();
                    {
                        let before = self.$type.len();
                        self.$type.retain(|_, v| !v.is_expired());
                        let after = self.$type.len();
                        if before != after {
                            tracing::info!(
                                "Cache expiry for {}: before {}, after {}",
                                stringify!($type),
                                before,
                                after
                            );
                        }
                    }
                    total_after += self.$type.len();
                )*

                tracing::info!(
                    "Cache expiry run completed. Total before: {}, total after: {}",
                    total_before,
                    total_after
                );
            }

            fn stats(&self) -> Vec<CacheStats> {
                vec![
                    $(
                        CacheStats {
                            name: stringify!($type),
                            items: self.$type.len(),
                            hits: self.$type.hits(),
                            misses: self.$type.misses(),
                        },
                    )*
                ]
            }
        }

    };
}

impl CacheStore {
    async fn notify_invalidate(&self, cache_type: CacheType, key: Uuid) {
        use redis::AsyncCommands as _;

        let Some(mut redis) = crate::redis::conn().await else {
            return;
        };
        let topic = cache_type.to_str();
        let msg = crate::pubsub::PubSubMessage::invalidate(topic.into(), key);
        let Ok(msg) = serde_json::to_string(&msg) else {
            return;
        };
        let _sent: u32 = redis.publish(topic, msg).await.unwrap_or_default();
    }
}

// Please adjust the cache capacities based on the production metrics.
define_caches! {
    (Channel, 5600),
    (Character, 4096),
    (CharacterVariables, 4096),
    (Session, 512),
    (User, 256),
    (UserExt, 256),
    (Space, 1200),
    (SpaceSettings, 64),
    (ChannelMembers, 128),
    (SpacesChannels, 700),
    (UserSpaces, 110),
}

pub static CACHE: LazyLock<CacheStore> = LazyLock::new(CacheStore::new);

pub fn start_log_cache_stats() {
    use std::time::Duration;
    use tokio::time::interval;

    tokio::spawn(async move {
        let mut interval = interval(Duration::from_mins(10));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        let total_gauge = metrics::gauge!("boluo_server_cache_items_total");
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    let mut total = 0;
                    for stats in CACHE.stats() {
                        total += stats.items;
                        let labels = vec![metrics::Label::new("cache", stats.name)];
                        metrics::gauge!("boluo_server_cache_items", labels.clone())
                            .set(stats.items as f64);
                        metrics::counter!("boluo_server_cache_hits_total", labels.clone())
                            .absolute(stats.hits);
                        metrics::counter!("boluo_server_cache_misses_total", labels)
                            .absolute(stats.misses);
                    }
                    total_gauge.set(total as f64);
                },
                _ = crate::shutdown::SHUTDOWN.notified() => {
                    break;
                }
            }
        }
    });
}

pub fn start_expiry_task() {
    use std::time::Duration;
    use tokio::time::interval;

    tokio::spawn(async move {
        let mut interval = interval(Duration::from_hours(1));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    CACHE.expiry();
                },
                _ = crate::shutdown::SHUTDOWN.notified() => {
                    break;
                }
            }
        }
    });
}
