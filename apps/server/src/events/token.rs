use std::{
    sync::Arc,
    time::{Duration, Instant},
};

use uuid::Uuid;

use crate::session::Session;

const TOKEN_VALIDITY: Duration = Duration::from_secs(10);

struct TokenInfo {
    session: Option<Session>,
    created_at: Instant,
}

impl TokenInfo {
    fn new(session: Option<Session>) -> Self {
        Self {
            session,
            created_at: Instant::now(),
        }
    }
    fn session(&self) -> Option<Session> {
        if self.created_at.elapsed() < TOKEN_VALIDITY {
            self.session.clone()
        } else {
            None
        }
    }
}

pub struct TokenStore {
    tokens: Arc<papaya::HashMap<Uuid, TokenInfo, ahash::RandomState>>,
}

impl TokenStore {
    fn new() -> Self {
        let tokens = Arc::new(papaya::HashMap::with_hasher(ahash::RandomState::new()));
        let tokens_for_cleanup = Arc::downgrade(&tokens);
        tokio::spawn(async move {
            let tokens = tokens_for_cleanup;
            let mut interval = tokio::time::interval(Duration::from_secs(60));
            loop {
                interval.tick().await;
                let Some(tokens) = tokens.upgrade() else {
                    break;
                };
                let mut token_store = tokens.pin();
                let now = Instant::now();
                token_store.retain(|_, token: &TokenInfo| now - token.created_at < TOKEN_VALIDITY);
            }
        });
        Self { tokens }
    }

    pub fn get_session(&self, token: Uuid) -> Option<Session> {
        let token_store = self.tokens.pin();
        token_store.get(&token).and_then(|token| token.session())
    }

    pub fn create_token(&self, session: Option<Session>) -> Uuid {
        let token_store = self.tokens.pin();
        let token = Uuid::new_v4();
        token_store.insert(token, TokenInfo::new(session));
        token
    }
}

pub static TOKEN_STORE: std::sync::LazyLock<TokenStore> =
    std::sync::LazyLock::new(|| TokenStore::new());
