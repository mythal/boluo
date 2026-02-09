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
    (ChannelMembers, 8193),
    (SpacesChannels, 1024),
    (UserSpaces, 4096),
}

pub static CACHE: LazyLock<CacheStore> = LazyLock::new(CacheStore::new);

pub fn start_log_cache_stats() {
    use std::time::Duration;
    use tokio::time::interval;

    tokio::spawn(async move {
        let mut interval = interval(Duration::from_mins(10));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        let channel_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "Channel")]
        );
        let character_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "Character")]
        );
        let character_variables_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "CharacterVariables")]
        );
        let session_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "Session")]
        );
        let user_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "User")]
        );
        let user_ext_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "UserExt")]
        );
        let space_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "Space")]
        );
        let space_settings_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "SpaceSettings")]
        );
        let channel_members_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "ChannelMembers")]
        );
        let spaces_channels_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "SpacesChannels")]
        );
        let user_spaces_gauge = metrics::gauge!(
            "boluo_server_cache_items",
            vec![metrics::Label::new("cache", "UserSpaces")]
        );
        let total_gauge = metrics::gauge!("boluo_server_cache_items_total");
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
                    let channel_members = CACHE.ChannelMembers.len();
                    let spaces_channels = CACHE.SpacesChannels.len();
                    let user_spaces = CACHE.UserSpaces.len();
                    let total = channel
                        + character
                        + character_variables
                        + session
                        + user
                        + user_ext
                        + space
                        + space_settings
                        + channel_members
                        + spaces_channels
                        + user_spaces;

                    channel_gauge.set(channel as f64);
                    character_gauge.set(character as f64);
                    character_variables_gauge.set(character_variables as f64);
                    session_gauge.set(session as f64);
                    user_gauge.set(user as f64);
                    user_ext_gauge.set(user_ext as f64);
                    space_gauge.set(space as f64);
                    space_settings_gauge.set(space_settings as f64);
                    channel_members_gauge.set(channel_members as f64);
                    spaces_channels_gauge.set(spaces_channels as f64);
                    user_spaces_gauge.set(user_spaces as f64);
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
