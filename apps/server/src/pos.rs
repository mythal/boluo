use ahash::RandomState;
use papaya::HashMap as PapayaHashMap;
use std::{
    collections::BTreeMap,
    sync::LazyLock,
    time::{Duration, Instant},
};
use tokio::sync::{
    mpsc::{self, error::TrySendError},
    oneshot,
};
use tracing::Instrument as _;

use crate::{
    error::{AppError, ValidationFailed},
    messages::MaxPos,
};
use num_rational::Rational32;
use uuid::Uuid;

pub fn check_pos((p, q): (i32, i32)) -> Result<(), ValidationFailed> {
    if q == 0 {
        return Err(ValidationFailed(r#""pos_q" cannot be 0"#));
    }
    if p < 0 || q < 0 {
        return Err(ValidationFailed(
            r#""pos_p" and "pos_q" cannot be negative numbers"#,
        ));
    }
    Ok(())
}

const PLACEHOLDER_POS_TIMEOUT: Duration = Duration::from_secs(60 * 60);
const INACTIVE_TIMEOUT: Duration = Duration::from_secs(60 * 60 * 12);
const TICK_INTERVAL: Duration = Duration::from_secs(60);

#[derive(Debug)]
pub enum PosAction {
    PreviewPos {
        item_id: Uuid,
        timeout: Duration,
        respond_to: oneshot::Sender<Result<Rational32, sqlx::Error>>,
    },
    SendingNewMessage {
        message_id: Uuid,
        request_pos: Option<(i32, i32)>,
        preview_id: Option<Uuid>,
        respond_to: oneshot::Sender<Result<Rational32, sqlx::Error>>,
    },
    Submitted {
        item_id: Uuid,
        pos_p: i32,
        pos_q: i32,
        old_item_id: Option<Uuid>,
    },
    Cancel {
        item_id: Uuid,
    },
    OnConflict {
        message_id: Uuid,
        respond_to: oneshot::Sender<Result<Rational32, sqlx::Error>>,
    },
    Tick,
    Shutdown,
}

impl PosAction {
    fn name(&self) -> &'static str {
        match self {
            PosAction::PreviewPos { .. } => "PreviewPos",
            PosAction::SendingNewMessage { .. } => "SendingNewMessage",
            PosAction::Submitted { .. } => "Submitted",
            PosAction::Cancel { .. } => "Cancel",
            PosAction::OnConflict { .. } => "OnConflict",
            PosAction::Tick => "Tick",
            PosAction::Shutdown => "Shutdown",
        }
    }
}

pub struct ChannelPosActor {
    created: Instant,
    channel_id: Uuid,
    positions: BTreeMap<Rational32, PosItem>,
    receiver: mpsc::Receiver<PosAction>,
}

impl ChannelPosActor {
    fn new(channel_id: Uuid, receiver: mpsc::Receiver<PosAction>) -> Self {
        Self {
            created: Instant::now(),
            channel_id,
            positions: BTreeMap::new(),
            receiver,
        }
    }

    pub async fn run(mut self) {
        let mut changed_at = Instant::now();
        let labels = vec![metrics::Label::new(
            "channel_id",
            self.channel_id.to_string(),
        )];
        let pending_gauge = metrics::gauge!("boluo_server_pos_pending_actions", labels.clone());
        let action_duration_histogram =
            metrics::histogram!("boluo_server_pos_action_duration_ms", labels.clone());

        while let Some(action) = self.receiver.recv().await {
            let pending = self.receiver.len();
            pending_gauge.set(pending as f64);
            if pending > 16 {
                tracing::info!(pending, "Too many pending actions");
            }
            let start = Instant::now();
            let action_name = action.name();
            let last_key = self.positions.last_key_value().map(|(key, _)| *key);
            match action {
                PosAction::PreviewPos {
                    item_id,
                    timeout,
                    respond_to,
                } => {
                    changed_at = Instant::now();
                    let result = self.handle_preview_pos(item_id, timeout).await;
                    let _ = respond_to.send(result);
                }
                PosAction::SendingNewMessage {
                    message_id,
                    request_pos,
                    preview_id,
                    respond_to,
                } => {
                    changed_at = Instant::now();
                    let result = self
                        .handle_sending_new_message(message_id, request_pos, preview_id)
                        .await;
                    let _ = respond_to.send(result);
                }
                PosAction::OnConflict {
                    message_id,
                    respond_to,
                } => {
                    changed_at = Instant::now();
                    let result = self.handle_on_conflict(message_id).await;
                    let _ = respond_to.send(result);
                }
                PosAction::Submitted {
                    item_id,
                    pos_p,
                    pos_q,
                    old_item_id,
                } => {
                    changed_at = Instant::now();
                    self.handle_submitted(item_id, pos_p, pos_q, old_item_id);
                }
                PosAction::Cancel { item_id } => {
                    changed_at = Instant::now();
                    self.delete_by_id(item_id);
                }
                PosAction::Shutdown => {
                    tracing::info!("Shutting down signal received");
                    break;
                }
                PosAction::Tick => {
                    if !self.receiver.is_empty() {
                        tracing::info!("Clean up skipped because of pending actions");
                        continue;
                    }
                    let now = Instant::now();
                    let idle = now - changed_at;
                    let Some((last_key, _last_pos_item)) = self.positions.last_key_value() else {
                        if idle > INACTIVE_TIMEOUT {
                            tracing::info!("Inactivity timeout reached");
                            break;
                        }
                        continue;
                    };
                    let last_key = *last_key;
                    if idle > INACTIVE_TIMEOUT {
                        tracing::info!("Inactivity timeout reached");
                        break;
                    }
                    let before_count = self.positions.len();
                    self.positions
                        .retain(|_, pos_item| !pos_item.pos_available(now));
                    let after_count = self.positions.len();
                    if before_count != after_count {
                        tracing::info!(
                            before = before_count,
                            after = after_count,
                            "Cleaned up pos items"
                        );
                    }
                    if let Some((last_key_after, _)) = self.positions.last_key_value() {
                        if *last_key_after >= last_key {
                            continue;
                        }
                    }
                    self.positions
                        .insert(last_key, PosItem::new(Uuid::nil(), PLACEHOLDER_POS_TIMEOUT));
                }
            }
            let current_last_key = self.positions.last_key_value().map(|(key, _)| *key);
            if let (Some(last_key), Some(current_last_key)) = (last_key, current_last_key) {
                if current_last_key < last_key {
                    tracing::warn!(
                        current_last_key = ?current_last_key,
                        last_key = ?last_key,
                        "Last key decreased"
                    );
                }
            }
            let elapsed = start.elapsed();
            action_duration_histogram.record(elapsed.as_millis() as f64);
            if elapsed > std::time::Duration::from_millis(8) {
                tracing::warn!(
                    action_name,
                    "Pos action took too long to process: {:?}",
                    elapsed
                );
            }
        }

        tracing::info!("Channel pos actor shutdown");
    }

    fn delete_by_id(&mut self, item_id: Uuid) {
        let Some((last_key, last_pos_item)) = self.positions.last_key_value() else {
            return;
        };
        let last_pos_item_id = last_pos_item.id;
        let last_key = *last_key;
        if last_pos_item_id == item_id {
            self.positions
                .insert(last_key, PosItem::new(Uuid::nil(), PLACEHOLDER_POS_TIMEOUT));
            return;
        }
        if self.positions.len() == 1 {
            return;
        }

        let mut iter = self.positions.iter().rev();
        iter.next();
        if let Some((pos, _)) = iter.find(|(_, pos_item)| pos_item.id == item_id) {
            let pos = *pos;
            self.positions.remove(&pos);
        }
    }

    fn is_pos_available(&self, pos: Rational32, item_id: Option<Uuid>) -> bool {
        let now = Instant::now();
        if let Some(pos_item) = self.positions.get(&pos) {
            if let Some(item_id) = item_id {
                if pos_item.id == item_id {
                    return pos_item.state != PosItemState::Submitting;
                }
            }
            pos_item.pos_available(now)
        } else {
            true
        }
    }

    fn find_pos_by_id(&self, item_id: Uuid) -> Option<Rational32> {
        let now = Instant::now();
        // TODO: optimize this
        self.positions
            .iter()
            .rev()
            .find(|(_, pos_item)| pos_item.id == item_id)
            .and_then(|(pos, pos_item)| {
                if pos_item.id == item_id || pos_item.pos_available(now) {
                    Some(*pos)
                } else {
                    None
                }
            })
    }

    async fn get_next_available_p(&mut self) -> Result<i32, sqlx::Error> {
        if let Some((last_key, _last_pos_item)) = self.positions.last_key_value() {
            let next_p = last_key.ceil().numer() + 1;
            return Ok(next_p);
        }

        let max_pos_result = {
            let mut db = crate::db::get().await.acquire().await?;
            crate::messages::Message::max_pos(&mut *db, &self.channel_id).await
        };

        match max_pos_result {
            Ok(MaxPos { pos_p, pos_q, id }) => {
                let pos = Rational32::new(pos_p, pos_q);
                self.positions.insert(pos, PosItem::submitted(id));
                Ok(pos.ceil().numer() + 1)
            }
            // If the channel has no messages, insert a placeholder pos item and return 43
            Err(sqlx::Error::RowNotFound) => {
                let pos = Rational32::new(42, 1);
                self.positions
                    .insert(pos, PosItem::new(Uuid::nil(), PLACEHOLDER_POS_TIMEOUT));
                Ok(43)
            }
            Err(e) => {
                tracing::error!(error = %e, "Failed to get max pos from database");
                Err(e)
            }
        }
    }

    fn try_remove_last_placeholder(&mut self, new_pos: Rational32) {
        if let Some(last_key) = self
            .positions
            .last_key_value()
            .and_then(|(last_key, pos_item)| {
                if pos_item.id.is_nil() && *last_key < new_pos {
                    Some(*last_key)
                } else {
                    None
                }
            })
        {
            self.positions.remove(&last_key);
        }
    }

    async fn handle_preview_pos(
        &mut self,
        item_id: Uuid,
        timeout: Duration,
    ) -> Result<Rational32, sqlx::Error> {
        if let Some(pos) = self.find_pos_by_id(item_id) {
            return Ok(pos);
        }

        let next_pos = self.get_next_available_p().await?;
        let pos_item = PosItem::new(item_id, timeout);
        let pos = Rational32::new(next_pos, 1);
        self.try_remove_last_placeholder(pos);
        self.positions.insert(pos, pos_item);
        Ok(pos)
    }

    async fn handle_sending_new_message(
        &mut self,
        message_id: Uuid,
        request_pos: Option<(i32, i32)>,
        preview_id: Option<Uuid>,
    ) -> Result<Rational32, sqlx::Error> {
        let maybe_pos: Option<(i32, i32)> = {
            match (request_pos, preview_id) {
                (Some(request_pos), preview_id) => {
                    if check_pos(request_pos).is_err() {
                        None
                    } else if self.is_pos_available(request_pos.into(), preview_id) {
                        Some(request_pos)
                    } else {
                        None
                    }
                }
                (None, Some(preview_id)) => {
                    self.find_pos_by_id(preview_id).map(|ratio| ratio.into())
                }
                (None, None) => None,
            }
        };
        let pos: Rational32 = if let Some(pos) = maybe_pos {
            pos.into()
        } else {
            (self.get_next_available_p().await?, 1).into()
        };
        self.try_remove_last_placeholder(pos);
        if let Some(old_item) = self.positions.insert(pos, PosItem::submitting(message_id)) {
            if Some(old_item.id) == preview_id {
                return Ok(pos);
            } else if !old_item.pos_available(Instant::now()) && old_item.id != message_id {
                tracing::warn!(
                    pos = ?pos,
                    old_item = ?old_item,
                    message_id = %message_id,
                    preview_id = ?preview_id,
                    "Pos item overwritten by new message"
                );
            }
        }
        if let Some(preview_id) = preview_id {
            self.delete_by_id(preview_id);
        }
        Ok(pos)
    }

    fn handle_submitted(
        &mut self,
        item_id: Uuid,
        pos_p: i32,
        pos_q: i32,
        old_item_id: Option<Uuid>,
    ) {
        let pos = Rational32::new(pos_p, pos_q);
        if let Some(old_item_id) = old_item_id {
            self.delete_by_id(old_item_id);
        }
        self.try_remove_last_placeholder(pos);
        self.positions.insert(pos, PosItem::submitted(item_id));
    }

    async fn handle_on_conflict(&mut self, message_id: Uuid) -> Result<Rational32, sqlx::Error> {
        self.delete_by_id(message_id);
        let max_pos = {
            let mut db = crate::db::get().await.acquire().await?;
            match crate::messages::Message::max_pos(&mut *db, &self.channel_id).await {
                Ok(max_pos) => max_pos,
                Err(sqlx::Error::RowNotFound) => {
                    tracing::error!("Conflict occurred but no messages in channel");
                    MaxPos {
                        pos_p: 42,
                        pos_q: 1,
                        id: Uuid::nil(),
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "Failed to get max pos from database");
                    return Err(e);
                }
            }
        };
        self.handle_submitted(max_pos.id, max_pos.pos_p, max_pos.pos_q, None);
        let (last_key, _) = self.positions.last_key_value().unwrap();
        let pos = Rational32::new(last_key.ceil().numer() + 1, 1);
        self.positions.insert(pos, PosItem::submitting(message_id));
        Ok(pos)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ChannelPosError {
    #[error("Actor shutdown")]
    ActorShutdown,
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("Timeout")]
    Timeout,
}

impl From<ChannelPosError> for AppError {
    fn from(error: ChannelPosError) -> Self {
        match error {
            ChannelPosError::ActorShutdown => {
                AppError::Unexpected(anyhow::anyhow!("Actor shutdown"))
            }
            ChannelPosError::Timeout => AppError::Timeout,
            ChannelPosError::DatabaseError(err) => AppError::Db { source: err },
        }
    }
}

struct PosActionSender {
    sender: mpsc::Sender<PosAction>,
}

impl PosActionSender {
    async fn send(&self, action: PosAction) -> Result<(), ChannelPosError> {
        let action = match self.sender.try_send(action) {
            Ok(_) => return Ok(()),
            Err(TrySendError::Closed(_)) => {
                return Err(ChannelPosError::ActorShutdown);
            }
            Err(TrySendError::Full(action)) => {
                tracing::info!("PosActionSender::send: full");
                action
            }
        };
        tokio::time::timeout(TICK_INTERVAL, self.sender.send(action))
            .await
            .map_err(|_| {
                tracing::warn!("PosActionSender::send: timeout");
                ChannelPosError::Timeout
            })?
            .map_err(|_| ChannelPosError::ActorShutdown)
    }
}

pub struct ChannelPosManager {
    actors: PapayaHashMap<Uuid, mpsc::Sender<PosAction>, RandomState>,
}

impl ChannelPosManager {
    pub fn new() -> Self {
        let manager = Self {
            actors: PapayaHashMap::builder()
                .capacity(1024)
                .hasher(RandomState::new())
                .build(),
        };
        let span = tracing::info_span!(parent: None, "channel_pos_manager_tick");
        tokio::spawn(
            async move {
                let mut interval = tokio::time::interval(TICK_INTERVAL);
                loop {
                    interval.tick().await;
                    CHANNEL_POS_MANAGER.tick();
                }
            }
            .instrument(span),
        );
        manager
    }
    fn get_or_create_actor(&self, channel_id: Uuid) -> PosActionSender {
        let actors = self.actors.pin();
        let result = actors.compute(channel_id, |entry| {
            if let Some((_, sender)) = entry {
                if !sender.is_closed() {
                    return papaya::Operation::Abort(sender.clone());
                }
            }
            let (sender, receiver) = mpsc::channel(256);
            let span =
                tracing::info_span!(parent: None, "channel_pos_actor", channel_id = %channel_id);
            tokio::spawn(
                async move {
                    let actor = ChannelPosActor::new(channel_id, receiver);
                    actor.run().await;
                }
                .instrument(span),
            );
            papaya::Operation::Insert(sender)
        });
        let sender = match result {
            papaya::Compute::Aborted(sender) => sender,
            papaya::Compute::Updated {
                new: (_, sender), ..
            } => sender.clone(),
            papaya::Compute::Inserted(_, sender) => sender.clone(),
            papaya::Compute::Removed(_, _) => unreachable!(),
        };
        PosActionSender { sender }
    }

    pub async fn preview_pos(
        &self,
        channel_id: Uuid,
        item_id: Uuid,
        timeout: Duration,
    ) -> Result<Rational32, ChannelPosError> {
        let sender = self.get_or_create_actor(channel_id);
        let (tx, rx) = oneshot::channel();

        sender
            .send(PosAction::PreviewPos {
                item_id,
                timeout,
                respond_to: tx,
            })
            .await
            .map_err(|_| ChannelPosError::ActorShutdown)?;

        rx.await
            .map_err(|_| ChannelPosError::ActorShutdown)?
            .map_err(ChannelPosError::DatabaseError)
    }

    pub async fn sending_new_message(
        &self,
        channel_id: Uuid,
        message_id: Uuid,
        request_pos: Option<(i32, i32)>,
        preview_id: Option<Uuid>,
    ) -> Result<Rational32, ChannelPosError> {
        let sender = self.get_or_create_actor(channel_id);
        let (tx, rx) = oneshot::channel();
        sender
            .send(PosAction::SendingNewMessage {
                message_id,
                request_pos,
                preview_id,
                respond_to: tx,
            })
            .await
            .map_err(|_| ChannelPosError::ActorShutdown)?;

        rx.await
            .map_err(|_| ChannelPosError::ActorShutdown)?
            .map_err(ChannelPosError::DatabaseError)
    }

    pub async fn on_conflict(
        &self,
        channel_id: Uuid,
        message_id: Uuid,
    ) -> Result<Rational32, ChannelPosError> {
        let sender = self.get_or_create_actor(channel_id);
        let (tx, rx) = oneshot::channel();
        sender
            .send(PosAction::OnConflict {
                message_id,
                respond_to: tx,
            })
            .await
            .map_err(|_| ChannelPosError::ActorShutdown)?;

        rx.await
            .map_err(|_| ChannelPosError::ActorShutdown)?
            .map_err(ChannelPosError::DatabaseError)
    }

    pub async fn submitted(
        &self,
        channel_id: Uuid,
        item_id: Uuid,
        pos_p: i32,
        pos_q: i32,
        old_item_id: Option<Uuid>,
    ) {
        let sender = self.get_or_create_actor(channel_id);
        let _ = sender
            .send(PosAction::Submitted {
                item_id,
                pos_p,
                pos_q,
                old_item_id,
            })
            .await;
    }

    pub async fn cancel(&self, channel_id: Uuid, item_id: Uuid) {
        let sender = self.get_or_create_actor(channel_id);
        let _ = sender.send(PosAction::Cancel { item_id }).await;
    }

    pub async fn shutdown(&self, channel_id: Uuid) {
        let sender = {
            let actors = self.actors.pin();
            actors.remove(&channel_id).cloned()
        };

        if let Some(sender) = sender {
            let _ = sender.send(PosAction::Shutdown).await;
        }
    }

    fn tick(&self) {
        let mut actors = self.actors.pin();
        actors.retain(|_, sender| {
            if sender.is_closed() {
                return false;
            }
            if let Err(tokio::sync::mpsc::error::TrySendError::Closed(_)) =
                sender.try_send(PosAction::Tick)
            {
                return false;
            }
            true
        });
    }
}

pub static CHANNEL_POS_MANAGER: LazyLock<ChannelPosManager> = LazyLock::new(ChannelPosManager::new);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PosItemState {
    LiveIn(std::time::Duration),
    Submitting,
    Submitted,
}

#[derive(Debug, Clone)]
pub struct PosItem {
    pub id: Uuid,
    pub state: PosItemState,
    created: std::time::Instant,
}

const SUBMITTING_TIMEOUT: Duration = Duration::from_secs(6);

impl PosItem {
    fn new(id: Uuid, timeout: Duration) -> Self {
        let now = std::time::Instant::now();
        Self {
            id,
            created: now,
            state: PosItemState::LiveIn(timeout),
        }
    }
    fn submitting(id: Uuid) -> Self {
        let now = std::time::Instant::now();
        Self {
            id,
            created: now,
            state: PosItemState::Submitting,
        }
    }
    fn submitted(id: Uuid) -> Self {
        let now = std::time::Instant::now();
        Self {
            id,
            created: now,
            state: PosItemState::Submitted,
        }
    }
    pub fn pos_available(&self, now: Instant) -> bool {
        if self.id.is_nil() {
            return true;
        }
        match self.state {
            PosItemState::LiveIn(timeout) => (now - self.created) >= timeout,
            PosItemState::Submitting => (now - self.created) >= SUBMITTING_TIMEOUT,
            PosItemState::Submitted => false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FailToFindIntermediate {
    EqualFractions,
    OutOfRange,
}

/// Find the intermediate fraction between p1/q1 and p2/q2.
///
/// References:
/// - https://begriffs.com/posts/2018-03-20-user-defined-order.html
/// - https://wiki.postgresql.org/wiki/User-specified_ordering_with_fractions
/// - https://en.wikipedia.org/wiki/Stern%E2%80%93Brocot_tree
pub fn find_intermediate(
    p1: i32,
    q1: i32,
    p2: i32,
    q2: i32,
) -> Result<(i32, i32), FailToFindIntermediate> {
    let p1_q2 = (p1 as i64)
        .checked_mul(q2 as i64)
        .ok_or(FailToFindIntermediate::OutOfRange)?;
    let p2_q1 = (p2 as i64)
        .checked_mul(q1 as i64)
        .ok_or(FailToFindIntermediate::OutOfRange)?;

    if p1_q2 == p2_q1 {
        return Err(FailToFindIntermediate::EqualFractions);
    }
    let (mut low, mut high) = ((0, 1), (1, 0));
    if p1_q2 + 1 == p2_q1 {
        return Ok((p1 + p2, q1 + q2));
    }
    loop {
        let p: i64 = low.0 + high.0;
        let q: i64 = low.1 + high.1;
        let p_q1 = p
            .checked_mul(q1 as i64)
            .ok_or(FailToFindIntermediate::OutOfRange)?;
        let p1_q = (p1 as i64)
            .checked_mul(q)
            .ok_or(FailToFindIntermediate::OutOfRange)?;
        let p2_q = (p2 as i64)
            .checked_mul(q)
            .ok_or(FailToFindIntermediate::OutOfRange)?;
        let p_q2 = p
            .checked_mul(q2 as i64)
            .ok_or(FailToFindIntermediate::OutOfRange)?;
        if p_q1 <= p1_q {
            low = (p, q);
        } else if p2_q <= p_q2 {
            high = (p, q);
        } else {
            return Ok((
                p.try_into()
                    .map_err(|_| FailToFindIntermediate::OutOfRange)?,
                q.try_into()
                    .map_err(|_| FailToFindIntermediate::OutOfRange)?,
            ));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_neighbors_1_3_1_2() {
        assert_eq!(find_intermediate(1, 3, 1, 2), Ok((2, 5)));
    }

    #[test]
    fn test_neighbors_1_2_2_3() {
        assert_eq!(find_intermediate(1, 2, 2, 3), Ok((3, 5)));
    }

    #[test]
    fn test_non_neighbors_1_4_1_2() {
        assert_eq!(find_intermediate(1, 4, 1, 2), Ok((1, 3)));
    }

    #[test]
    fn test_non_neighbors_1_3_2_3() {
        assert_eq!(find_intermediate(1, 3, 2, 3), Ok((1, 2)));
    }

    #[test]
    fn test_neighbors_2_3_3_4() {
        assert_eq!(find_intermediate(2, 3, 3, 4), Ok((5, 7)));
    }

    #[test]
    fn test_edge_0_1_1_1() {
        assert_eq!(find_intermediate(0, 1, 1, 1), Ok((1, 2)));
    }

    #[test]
    fn test_far_apart_1_100_1_1() {
        assert_eq!(find_intermediate(1, 100, 1, 1), Ok((1, 2)));
    }

    #[test]
    fn test_equal_fractions_1_2_1_2() {
        assert_eq!(
            find_intermediate(1, 2, 1, 2),
            Err(FailToFindIntermediate::EqualFractions)
        );
    }

    #[tokio::test]
    async fn test_actor_basic_operations() {
        let manager = ChannelPosManager::new();
        let channel_id = Uuid::new_v4();
        let item_id = Uuid::new_v4();

        // Test cancel operation
        manager.cancel(channel_id, item_id).await;

        // Test submitted operation
        manager.submitted(channel_id, item_id, 42, 1, None).await;

        // Test reset operation
        manager.shutdown(channel_id).await;
    }
}
