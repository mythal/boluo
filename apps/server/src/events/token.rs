use std::{
    sync::Arc,
    time::{Duration, Instant},
};

use tracing::Instrument as _;
use uuid::Uuid;

use crate::session::Session;

const TOKEN_VALIDITY: Duration = Duration::from_secs(60);

#[derive(Debug, Clone, Copy, thiserror::Error)]
pub enum SessionError {
    #[error("Token is invalid")]
    Invalid,
    #[error("Token has expired")]
    Expired,
}

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
            self.session
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
        let span = tracing::info_span!(parent: None, "token_store_cleanup");
        tokio::spawn(
            async move {
                let tokens = tokens_for_cleanup;
                let mut interval = crate::utils::cleaner_interval(60);
                loop {
                    interval.tick().await;
                    let Some(tokens) = tokens.upgrade() else {
                        break;
                    };
                    let mut token_store = tokens.pin();
                    let now = Instant::now();
                    let before = token_store.len();
                    token_store
                        .retain(|_, token: &TokenInfo| now - token.created_at < TOKEN_VALIDITY);
                    let after = token_store.len();
                    if before != after {
                        tracing::info!(before, after, "token store cleaned up");
                    }
                }
            }
            .instrument(span),
        );
        Self { tokens }
    }

    pub fn get_session(&self, token: Uuid) -> Result<Session, SessionError> {
        let token_store = self.tokens.pin();
        if let Some(token) = token_store.get(&token) {
            if let Some(session) = token.session() {
                Ok(session)
            } else {
                Err(SessionError::Expired)
            }
        } else {
            Err(SessionError::Invalid)
        }
    }

    pub fn create_token(&self, session: Option<Session>) -> Uuid {
        let token_store = self.tokens.pin();
        let token = Uuid::new_v4();
        token_store.insert(token, TokenInfo::new(session));
        token
    }
}

pub static TOKEN_STORE: std::sync::LazyLock<TokenStore> = std::sync::LazyLock::new(TokenStore::new);
