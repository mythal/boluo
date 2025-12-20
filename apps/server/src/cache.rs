use std::sync::LazyLock;

use quick_cache::sync::Cache;
use uuid::Uuid;

use crate::channels::{Channel, ChannelMembers};
use crate::characters::{Character, CharacterVariables};
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
    (Character, 4096),
    (CharacterVariables, 4096),
    (Session, 4096),
    (User, 4096),
    (UserExt, 4096),
    (Space, 1024),
    (SpaceSettings, 4096),
    (GetMe, 4096),
    (ChannelMembers, 8192),
    (UserSpaces, 4096),
}

pub static CACHE: LazyLock<CacheStore> = LazyLock::new(CacheStore::new);

pub fn start_log_cache_stats() {
    use std::time::Duration;
    use tokio::time::interval;

    tokio::spawn(async move {
        let mut interval = interval(Duration::from_mins(10));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    let channel = CACHE.Channel.len();
                    let character = CACHE.Character.len();
                    let character_variables = CACHE.CharacterVariables.len();
                    let session = CACHE.Session.len();
                    let user = CACHE.User.len();
                    let user_ext = CACHE.UserExt.len();
                    let space = CACHE.Space.len();
                    let space_settings = CACHE.SpaceSettings.len();
                    let get_me = CACHE.GetMe.len();
                    let channel_members = CACHE.ChannelMembers.len();
                    let user_spaces = CACHE.UserSpaces.len();

                    let status_json = serde_json::json!({
                        "type": "CacheStats",
                        "Channels": channel,
                        "Characters": character,
                        "CharacterVariables": character_variables,
                        "Sessions": session,
                        "Users": user,
                        "UserExts": user_ext,
                        "Spaces": space,
                        "SpaceSettings": space_settings,
                        "GetMe": get_me,
                        "ChannelMembers": channel_members,
                        "UserSpaces": user_spaces,
                    });

                    tracing::info!( "{}", status_json);
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
