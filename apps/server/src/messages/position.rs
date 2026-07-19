use std::time::{Duration, Instant};

use num_rational::Rational32;
use uuid::Uuid;

use crate::error::AppError;
use crate::pos::{CHANNEL_POS_MANAGER, ChannelPosHandle, PositionAllocation, TailPosition};

use super::Message;
use super::models::MaxPos;

const MAX_TAIL_SYNC_ATTEMPTS: usize = 3;

#[derive(Clone, Copy)]
enum PersistedTailLoadReason {
    Cold,
    Conflict,
}

impl PersistedTailLoadReason {
    fn as_str(self) -> &'static str {
        match self {
            Self::Cold => "cold",
            Self::Conflict => "conflict",
        }
    }
}

impl From<MaxPos> for TailPosition {
    fn from(max_pos: MaxPos) -> Self {
        Self {
            id: max_pos.id,
            pos_p: max_pos.pos_p,
            pos_q: max_pos.pos_q,
        }
    }
}

pub(crate) struct MessagePositionService;

impl MessagePositionService {
    // Database access stays in this facade so the actor only serializes
    // in-memory position state transitions.
    async fn load_persisted_tail(
        pool: &sqlx::PgPool,
        channel_id: Uuid,
        reason: PersistedTailLoadReason,
    ) -> Result<Option<TailPosition>, AppError> {
        let reason = reason.as_str();
        let load_started = Instant::now();
        let acquire_started = Instant::now();
        let connection = pool.acquire().await;
        metrics::histogram!(
            "boluo_server_pos_persisted_tail_db_acquire_duration_seconds",
            "reason" => reason,
            "result" => if connection.is_ok() { "ok" } else { "error" },
        )
        .record(acquire_started.elapsed().as_secs_f64());
        let mut connection = match connection {
            Ok(connection) => connection,
            Err(error) => {
                metrics::histogram!(
                    "boluo_server_pos_persisted_tail_load_duration_seconds",
                    "reason" => reason,
                    "result" => "error",
                )
                .record(load_started.elapsed().as_secs_f64());
                tracing::error!(
                    %channel_id,
                    %error,
                    reason,
                    "Failed to acquire a database connection for the persisted position tail"
                );
                return Err(error.into());
            }
        };

        let result = Message::max_pos(&mut *connection, &channel_id).await;
        let result_label = match &result {
            Ok(_) => "found",
            Err(sqlx::Error::RowNotFound) => "empty",
            Err(_) => "error",
        };
        metrics::histogram!(
            "boluo_server_pos_persisted_tail_load_duration_seconds",
            "reason" => reason,
            "result" => result_label,
        )
        .record(load_started.elapsed().as_secs_f64());

        match result {
            Ok(max_pos) => Ok(Some(max_pos.into())),
            Err(sqlx::Error::RowNotFound) => Ok(None),
            Err(error) => {
                tracing::error!(
                    %channel_id,
                    %error,
                    reason,
                    "Failed to query the persisted position tail"
                );
                Err(error.into())
            }
        }
    }

    async fn ensure_persisted_tail(
        &self,
        pool: &sqlx::PgPool,
        channel_id: Uuid,
        handle: &ChannelPosHandle,
    ) -> Result<(), AppError> {
        let _guard = handle.lock_tail_sync().await;
        if handle.is_initialized().await? {
            return Ok(());
        }
        let tail =
            Self::load_persisted_tail(pool, channel_id, PersistedTailLoadReason::Cold).await?;
        handle.apply_persisted_tail(tail).await?;
        Ok(())
    }

    fn exhausted(channel_id: Uuid) -> AppError {
        tracing::error!(%channel_id, "Channel message position range is exhausted");
        AppError::Unexpected(anyhow::anyhow!(
            "Channel message position range is exhausted"
        ))
    }

    fn begin_tail_sync_attempt(
        channel_id: Uuid,
        operation: &'static str,
        attempts: &mut usize,
    ) -> Result<(), AppError> {
        if *attempts >= MAX_TAIL_SYNC_ATTEMPTS {
            tracing::error!(
                %channel_id,
                operation,
                attempts = *attempts,
                "Channel persisted-tail synchronization attempt limit reached"
            );
            return Err(AppError::Unexpected(anyhow::anyhow!(
                "Channel persisted-tail synchronization attempt limit reached"
            )));
        }
        if *attempts > 0 {
            metrics::counter!(
                "boluo_server_pos_persisted_tail_sync_retry_total",
                "operation" => operation,
            )
            .increment(1);
            tracing::warn!(
                %channel_id,
                operation,
                attempt = *attempts + 1,
                "Retrying channel persisted-tail synchronization"
            );
        }
        *attempts += 1;
        Ok(())
    }

    pub(crate) async fn preview_pos(
        &self,
        pool: &sqlx::PgPool,
        channel_id: Uuid,
        item_id: Uuid,
        timeout: Duration,
    ) -> Result<Rational32, AppError> {
        let handle = CHANNEL_POS_MANAGER.get_or_create_handle(channel_id);
        let mut tail_sync_attempts = 0;
        loop {
            match handle.preview_pos(item_id, timeout).await? {
                PositionAllocation::Reserved(pos) => return Ok(pos),
                PositionAllocation::NeedsPersistedTail => {
                    Self::begin_tail_sync_attempt(
                        channel_id,
                        "preview_pos",
                        &mut tail_sync_attempts,
                    )?;
                    self.ensure_persisted_tail(pool, channel_id, &handle)
                        .await?;
                }
                PositionAllocation::Exhausted => return Err(Self::exhausted(channel_id)),
            }
        }
    }

    pub(crate) async fn sending_new_message(
        &self,
        pool: &sqlx::PgPool,
        channel_id: Uuid,
        message_id: Uuid,
        request_pos: Option<(i32, i32)>,
        preview_id: Option<Uuid>,
    ) -> Result<Rational32, AppError> {
        let handle = CHANNEL_POS_MANAGER.get_or_create_handle(channel_id);
        let mut tail_sync_attempts = 0;
        loop {
            match handle
                .sending_new_message(message_id, request_pos, preview_id)
                .await?
            {
                PositionAllocation::Reserved(pos) => return Ok(pos),
                PositionAllocation::NeedsPersistedTail => {
                    Self::begin_tail_sync_attempt(
                        channel_id,
                        "sending_new_message",
                        &mut tail_sync_attempts,
                    )?;
                    self.ensure_persisted_tail(pool, channel_id, &handle)
                        .await?;
                }
                PositionAllocation::Exhausted => return Err(Self::exhausted(channel_id)),
            }
        }
    }

    pub(crate) async fn on_conflict(
        &self,
        pool: &sqlx::PgPool,
        channel_id: Uuid,
        message_id: Uuid,
    ) -> Result<Rational32, AppError> {
        let handle = CHANNEL_POS_MANAGER.get_or_create_handle(channel_id);
        let guard = handle.lock_tail_sync().await;
        let result: Result<Rational32, AppError> = async {
            let tail =
                Self::load_persisted_tail(pool, channel_id, PersistedTailLoadReason::Conflict)
                    .await?;
            if tail.is_none() {
                tracing::error!(%channel_id, "Position conflict occurred in an empty channel");
            }
            match handle.on_conflict(message_id, tail).await? {
                PositionAllocation::Reserved(pos) => Ok(pos),
                PositionAllocation::Exhausted => Err(Self::exhausted(channel_id)),
                PositionAllocation::NeedsPersistedTail => {
                    unreachable!("applying the persisted tail initializes position state")
                }
            }
        }
        .await;
        drop(guard);
        if result.is_err() {
            handle.cancel(message_id);
        }
        result
    }

    pub(crate) fn submitted(
        &self,
        channel_id: Uuid,
        item_id: Uuid,
        pos_p: i32,
        pos_q: i32,
        old_item_id: Option<Uuid>,
    ) {
        CHANNEL_POS_MANAGER.submitted(channel_id, item_id, pos_p, pos_q, old_item_id);
    }

    pub(crate) fn cancel(&self, channel_id: Uuid, item_id: Uuid) {
        CHANNEL_POS_MANAGER.cancel(channel_id, item_id);
    }

    pub(crate) fn shutdown(&self, channel_id: Uuid) {
        CHANNEL_POS_MANAGER.shutdown(channel_id);
    }

    pub(crate) fn actor_count(&self) -> usize {
        CHANNEL_POS_MANAGER.actor_count()
    }
}

pub(crate) static MESSAGE_POSITIONS: MessagePositionService = MessagePositionService;

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::{PgConnectOptions, PgPoolOptions};

    #[tokio::test]
    async fn conflict_error_cancels_reservation() {
        let service = MessagePositionService;
        let channel_id = Uuid::new_v4();
        let message_id = Uuid::new_v4();
        CHANNEL_POS_MANAGER
            .get_or_create_handle(channel_id)
            .apply_persisted_tail(None)
            .await
            .expect("failed to initialize position state");

        let closed_pool = PgPoolOptions::new().connect_lazy_with(PgConnectOptions::new());
        closed_pool.close().await;

        let reserved = service
            .sending_new_message(&closed_pool, channel_id, message_id, Some((100, 1)), None)
            .await
            .expect("failed to reserve requested position");
        assert_eq!(reserved, Rational32::new(100, 1));

        assert!(
            service
                .on_conflict(&closed_pool, channel_id, message_id)
                .await
                .is_err()
        );

        let replacement = service
            .sending_new_message(
                &closed_pool,
                channel_id,
                Uuid::new_v4(),
                Some((100, 1)),
                None,
            )
            .await
            .expect("failed reservation was not cancelled");
        assert_eq!(replacement, Rational32::new(100, 1));

        service.shutdown(channel_id);
    }
}
