use std::sync::LazyLock;

use quick_cache::sync::Cache;
use uuid::Uuid;

use crate::channels::{Channel, ChannelMembers};
use crate::session::Session;
use crate::spaces::{Space, SpaceSettings, UserSpaces};
use crate::users::GetMe;
use crate::users::User;
use crate::users::UserExt;

trait GetCacheType {
    fn tag() -> CacheType;
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

define_caches! {
    (Channel, 8192),
    (Session, 8192),
    (User, 8192),
    (UserExt, 8192),
    (Space, 1024),
    (SpaceSettings, 8192),
    (GetMe, 8192),
    (ChannelMembers, 8192),
    (UserSpaces, 4096),
}

pub static CACHE: LazyLock<CacheStore> = LazyLock::new(CacheStore::new);
