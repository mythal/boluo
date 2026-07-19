use ahash::RandomState;
use papaya::HashMap as PapayaHashMap;
use std::{
    collections::BTreeMap,
    sync::{Arc, LazyLock},
    time::{Duration, Instant},
};
use tokio::sync::{
    Mutex, MutexGuard,
    mpsc::{self, error::TrySendError},
    oneshot,
};
use tracing::Instrument as _;

use crate::error::{AppError, ValidationFailed};
use num_rational::Rational32;
use uuid::Uuid;

// Limit the numeric value rather than the numerator. Keeping it far below
// i32::MAX leaves more than two billion integer positions for server appends.
pub(crate) const MAX_REQUEST_POSITION: i32 = 1_000_000;

pub(crate) fn check_pos((p, q): (i32, i32)) -> Result<(), ValidationFailed> {
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

fn check_request_pos((p, q): (i32, i32)) -> Result<(), ValidationFailed> {
    check_pos((p, q))?;
    if i64::from(p) > i64::from(MAX_REQUEST_POSITION) * i64::from(q) {
        return Err(ValidationFailed(r#""pos" is too large"#));
    }
    Ok(())
}

const INACTIVE_TIMEOUT: Duration = Duration::from_secs(60 * 60 * 12);
const TICK_INTERVAL: Duration = Duration::from_secs(60);
const SUBMITTED_RETENTION: Duration = Duration::from_secs(60 * 60 * 6);
const ACTION_SEND_TIMEOUT: Duration = Duration::from_secs(2);
const ACTION_RESPONSE_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Debug)]
enum PosAction {
    PreviewPos {
        item_id: Uuid,
        timeout: Duration,
        respond_to: oneshot::Sender<PositionAllocation>,
    },
    SendingNewMessage {
        message_id: Uuid,
        request_pos: Option<(i32, i32)>,
        preview_id: Option<Uuid>,
        respond_to: oneshot::Sender<PositionAllocation>,
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
        tail: Option<TailPosition>,
        respond_to: oneshot::Sender<PositionAllocation>,
    },
    ApplyPersistedTail {
        tail: Option<TailPosition>,
        respond_to: oneshot::Sender<()>,
    },
    IsInitialized {
        respond_to: oneshot::Sender<bool>,
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
            PosAction::ApplyPersistedTail { .. } => "ApplyPersistedTail",
            PosAction::IsInitialized { .. } => "IsInitialized",
            PosAction::Tick => "Tick",
            PosAction::Shutdown => "Shutdown",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct TailPosition {
    pub(crate) id: Uuid,
    pub(crate) pos_p: i32,
    pub(crate) pos_q: i32,
}

impl TailPosition {
    fn ratio(self) -> Rational32 {
        Rational32::new(self.pos_p, self.pos_q)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum PositionAllocation {
    Reserved(Rational32),
    NeedsPersistedTail,
    Exhausted,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TailState {
    Uninitialized,
    Initialized(Rational32),
}

struct PositionExhausted;

struct ChannelPosState {
    tail: TailState,
    positions: BTreeMap<Rational32, PosItem>,
}

impl ChannelPosState {
    fn new() -> Self {
        Self {
            tail: TailState::Uninitialized,
            positions: BTreeMap::new(),
        }
    }

    fn is_initialized(&self) -> bool {
        matches!(self.tail, TailState::Initialized(_))
    }

    fn apply_persisted_tail(&mut self, tail: Option<TailPosition>) {
        // An empty channel uses 42 as its compatibility baseline, making 43
        // the first allocated integer position. Initialization only advances
        // the high-water mark: persisted and locally observed positions are
        // merged so a late database read can never move allocation backwards.
        let baseline = tail
            .map(TailPosition::ratio)
            .unwrap_or_else(|| Rational32::new(42, 1));
        let known_tail = match self.tail {
            TailState::Uninitialized => baseline,
            TailState::Initialized(current) => current.max(baseline),
        };
        let observed_tail = self.positions.iter().next_back().map(|(pos, _)| *pos);
        self.tail =
            TailState::Initialized(observed_tail.map_or(known_tail, |pos| known_tail.max(pos)));
        if let Some(tail) = tail {
            self.positions
                .insert(tail.ratio(), PosItem::submitted(tail.id));
        }
    }

    fn advance_tail(&mut self, pos: Rational32) {
        if let TailState::Initialized(tail) = &mut self.tail {
            *tail = (*tail).max(pos);
        }
    }

    fn next_available_p(&self) -> Result<Option<i32>, PositionExhausted> {
        let TailState::Initialized(tail) = self.tail else {
            return Ok(None);
        };
        let last = self
            .positions
            .last_key_value()
            .map_or(tail, |(pos, _)| tail.max(*pos));
        let numerator = i64::from(*last.numer());
        let denominator = i64::from(*last.denom());
        let ceil = numerator / denominator + i64::from(numerator % denominator > 0);
        let next = ceil.checked_add(1).ok_or(PositionExhausted)?;
        i32::try_from(next).map(Some).map_err(|_| PositionExhausted)
    }

    fn delete_by_id(&mut self, item_id: Uuid) {
        let Some(pos) = self
            .positions
            .iter()
            .rev()
            .find(|(_, item)| item.id == item_id)
            .map(|(pos, _)| *pos)
        else {
            return;
        };
        self.positions.remove(&pos);
    }

    fn is_pos_available(&self, pos: Rational32, item_id: Option<Uuid>) -> bool {
        let now = Instant::now();
        if let Some(pos_item) = self.positions.get(&pos) {
            if let Some(item_id) = item_id
                && pos_item.id == item_id
            {
                return pos_item.state != PosItemState::Submitting;
            }
            pos_item.pos_available(now)
        } else {
            true
        }
    }

    fn restore_active_position(&self, item_id: Uuid) -> Option<Rational32> {
        let now = Instant::now();
        self.positions
            .iter()
            .rev()
            .find(|(_, pos_item)| pos_item.id == item_id)
            .and_then(|(pos, pos_item)| match pos_item.state {
                PosItemState::LiveIn(timeout) if (now - pos_item.created) < timeout => Some(*pos),
                _ => None,
            })
    }

    fn preview_pos(&mut self, item_id: Uuid, timeout: Duration) -> PositionAllocation {
        if let Some(pos) = self.restore_active_position(item_id) {
            return PositionAllocation::Reserved(pos);
        }
        let next_pos = match self.next_available_p() {
            Ok(Some(next_pos)) => next_pos,
            Ok(None) => return PositionAllocation::NeedsPersistedTail,
            Err(PositionExhausted) => return PositionAllocation::Exhausted,
        };
        let pos = Rational32::new(next_pos, 1);
        self.positions.insert(pos, PosItem::new(item_id, timeout));
        self.advance_tail(pos);
        PositionAllocation::Reserved(pos)
    }

    fn sending_new_message(
        &mut self,
        message_id: Uuid,
        request_pos: Option<(i32, i32)>,
        preview_id: Option<Uuid>,
    ) -> PositionAllocation {
        let maybe_pos = match (request_pos, preview_id) {
            (Some(request_pos), preview_id) => {
                if check_request_pos(request_pos).is_ok()
                    && self.is_pos_available(request_pos.into(), preview_id)
                {
                    Some(request_pos)
                } else {
                    None
                }
            }
            (None, Some(preview_id)) => self.restore_active_position(preview_id).map(Into::into),
            (None, None) => None,
        };
        let pos = if let Some(pos) = maybe_pos {
            pos.into()
        } else {
            let next_pos = match self.next_available_p() {
                Ok(Some(next_pos)) => next_pos,
                Ok(None) => return PositionAllocation::NeedsPersistedTail,
                Err(PositionExhausted) => return PositionAllocation::Exhausted,
            };
            Rational32::new(next_pos, 1)
        };
        if let Some(old_item) = self.positions.insert(pos, PosItem::submitting(message_id))
            && Some(old_item.id) != preview_id
            && !old_item.pos_available(Instant::now())
            && old_item.id != message_id
        {
            tracing::warn!(
                pos = ?pos,
                old_item = ?old_item,
                message_id = %message_id,
                preview_id = ?preview_id,
                "Pos item overwritten by new message"
            );
        }
        if let Some(preview_id) = preview_id {
            self.delete_by_id(preview_id);
        }
        self.advance_tail(pos);
        PositionAllocation::Reserved(pos)
    }

    fn submitted(&mut self, item_id: Uuid, pos_p: i32, pos_q: i32, old_item_id: Option<Uuid>) {
        let pos = Rational32::new(pos_p, pos_q);
        if let Some(old_item_id) = old_item_id {
            self.delete_by_id(old_item_id);
        }
        self.positions.insert(pos, PosItem::submitted(item_id));
        self.advance_tail(pos);
    }

    fn on_conflict(&mut self, message_id: Uuid, tail: Option<TailPosition>) -> PositionAllocation {
        self.delete_by_id(message_id);
        self.apply_persisted_tail(tail);
        let next_pos = match self.next_available_p() {
            Ok(Some(next_pos)) => next_pos,
            Ok(None) => unreachable!("applying the persisted tail must initialize position state"),
            Err(PositionExhausted) => return PositionAllocation::Exhausted,
        };
        let pos = Rational32::new(next_pos, 1);
        self.positions.insert(pos, PosItem::submitting(message_id));
        self.advance_tail(pos);
        PositionAllocation::Reserved(pos)
    }

    fn trim_submitted_positions(&mut self, now: Instant) {
        self.positions.retain(|_, pos_item| {
            pos_item.state != PosItemState::Submitted
                || now.saturating_duration_since(pos_item.created) <= SUBMITTED_RETENTION
        });
    }
}

struct ChannelPosActor {
    channel_id: Uuid,
    state: ChannelPosState,
    receiver: mpsc::Receiver<PosAction>,
}

impl ChannelPosActor {
    fn new(channel_id: Uuid, receiver: mpsc::Receiver<PosAction>) -> Self {
        Self {
            channel_id,
            state: ChannelPosState::new(),
            receiver,
        }
    }

    async fn run(mut self) {
        let mut changed_at = Instant::now();
        let action_duration_histogram = metrics::histogram!("boluo_server_pos_action_duration_ms");
        let positions_len_histogram = metrics::histogram!("boluo_server_pos_positions_len");

        while let Some(action) = self.receiver.recv().await {
            let pending = self.receiver.len();
            if pending > 16 {
                tracing::info!(pending, channel_id = %self.channel_id, "Too many pending actions");
            }
            let start = Instant::now();
            let action_name = action.name();
            match action {
                PosAction::PreviewPos {
                    item_id,
                    timeout,
                    respond_to,
                } => {
                    changed_at = Instant::now();
                    let result = self.state.preview_pos(item_id, timeout);
                    let _ = respond_to.send(result);
                }
                PosAction::SendingNewMessage {
                    message_id,
                    request_pos,
                    preview_id,
                    respond_to,
                } => {
                    changed_at = Instant::now();
                    let result =
                        self.state
                            .sending_new_message(message_id, request_pos, preview_id);
                    let _ = respond_to.send(result);
                }
                PosAction::OnConflict {
                    message_id,
                    tail,
                    respond_to,
                } => {
                    changed_at = Instant::now();
                    let result = self.state.on_conflict(message_id, tail);
                    let _ = respond_to.send(result);
                }
                PosAction::ApplyPersistedTail { tail, respond_to } => {
                    changed_at = Instant::now();
                    self.state.apply_persisted_tail(tail);
                    let _ = respond_to.send(());
                }
                PosAction::IsInitialized { respond_to } => {
                    let _ = respond_to.send(self.state.is_initialized());
                }
                PosAction::Submitted {
                    item_id,
                    pos_p,
                    pos_q,
                    old_item_id,
                } => {
                    changed_at = Instant::now();
                    self.state.submitted(item_id, pos_p, pos_q, old_item_id);
                }
                PosAction::Cancel { item_id } => {
                    changed_at = Instant::now();
                    self.state.delete_by_id(item_id);
                }
                PosAction::Shutdown => {
                    tracing::info!("Shutting down signal received");
                    break;
                }
                PosAction::Tick => {
                    if !self.receiver.is_empty() {
                        tracing::info!("Clean up skipped because of pending actions");
                        positions_len_histogram.record(self.state.positions.len() as f64);
                        continue;
                    }
                    let now = Instant::now();
                    let idle = now - changed_at;
                    if idle > INACTIVE_TIMEOUT {
                        tracing::info!("Inactivity timeout reached");
                        break;
                    }
                    let before_count = self.state.positions.len();
                    self.state
                        .positions
                        .retain(|_, pos_item| !pos_item.pos_available(now));
                    self.state.trim_submitted_positions(now);
                    let after_count = self.state.positions.len();
                    if before_count != after_count {
                        tracing::info!(
                            before = before_count,
                            after = after_count,
                            "Cleaned up pos items"
                        );
                    }
                    positions_len_histogram.record(self.state.positions.len() as f64);
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
}

#[derive(Debug, thiserror::Error)]
pub(crate) enum ChannelPosError {
    #[error("Actor shutdown")]
    ActorShutdown,
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
        }
    }
}

#[derive(Clone)]
pub(crate) struct ChannelPosHandle {
    channel_id: Uuid,
    sender: mpsc::Sender<PosAction>,
    // The synchronization gate belongs to this exact actor generation. Keeping
    // it beside the sender ensures an in-flight load cannot target a replacement
    // actor created for the same channel after shutdown.
    tail_sync: Arc<Mutex<()>>,
}

impl ChannelPosHandle {
    async fn send(&self, action: PosAction) -> Result<(), ChannelPosError> {
        let action = match self.sender.try_send(action) {
            Ok(_) => return Ok(()),
            Err(TrySendError::Closed(_)) => {
                return Err(ChannelPosError::ActorShutdown);
            }
            Err(TrySendError::Full(action)) => {
                tracing::info!(
                    channel_id = %self.channel_id,
                    action = action.name(),
                    "ChannelPosHandle::send: full"
                );
                action
            }
        };
        let action_name = action.name();
        tokio::time::timeout(ACTION_SEND_TIMEOUT, self.sender.send(action))
            .await
            .map_err(|_| {
                tracing::warn!(
                    channel_id = %self.channel_id,
                    action = action_name,
                    timeout_ms = ACTION_SEND_TIMEOUT.as_millis(),
                    "ChannelPosHandle::send: timeout"
                );
                ChannelPosError::Timeout
            })?
            .map_err(|_| ChannelPosError::ActorShutdown)
    }

    fn send_nonblocking(&self, action: PosAction) {
        match self.sender.try_send(action) {
            Ok(_) => {}
            Err(TrySendError::Closed(action)) => {
                tracing::warn!(
                    channel_id = %self.channel_id,
                    action = action.name(),
                    "ChannelPosHandle::send_nonblocking: actor closed"
                );
            }
            Err(TrySendError::Full(action)) => {
                let action_name = action.name();
                let sender = self.sender.clone();
                let channel_id = self.channel_id;
                tokio::spawn(async move {
                    match tokio::time::timeout(ACTION_SEND_TIMEOUT, sender.send(action)).await {
                        Ok(Ok(())) => {}
                        Ok(Err(_)) => {
                            tracing::warn!(
                                %channel_id,
                                action = action_name,
                                "ChannelPosHandle::send_nonblocking: actor closed while waiting"
                            );
                        }
                        Err(_) => {
                            tracing::warn!(
                                %channel_id,
                                action = action_name,
                                timeout_ms = ACTION_SEND_TIMEOUT.as_millis(),
                                "ChannelPosHandle::send_nonblocking: timeout"
                            );
                        }
                    }
                });
            }
        }
    }

    pub(crate) async fn lock_tail_sync(&self) -> MutexGuard<'_, ()> {
        self.tail_sync.lock().await
    }

    pub(crate) async fn preview_pos(
        &self,
        item_id: Uuid,
        timeout: Duration,
    ) -> Result<PositionAllocation, ChannelPosError> {
        let (tx, rx) = oneshot::channel();

        self.send(PosAction::PreviewPos {
            item_id,
            timeout,
            respond_to: tx,
        })
        .await?;

        tokio::time::timeout(ACTION_RESPONSE_TIMEOUT, rx)
            .await
            .map_err(|_| {
                tracing::warn!(
                    channel_id = %self.channel_id,
                    item_id = %item_id,
                    timeout_ms = ACTION_RESPONSE_TIMEOUT.as_millis(),
                    "ChannelPosHandle::preview_pos: timeout waiting actor response"
                );
                ChannelPosError::Timeout
            })?
            .map_err(|_| ChannelPosError::ActorShutdown)
    }

    pub(crate) async fn sending_new_message(
        &self,
        message_id: Uuid,
        request_pos: Option<(i32, i32)>,
        preview_id: Option<Uuid>,
    ) -> Result<PositionAllocation, ChannelPosError> {
        let (tx, rx) = oneshot::channel();
        self.send(PosAction::SendingNewMessage {
            message_id,
            request_pos,
            preview_id,
            respond_to: tx,
        })
        .await?;

        tokio::time::timeout(ACTION_RESPONSE_TIMEOUT, rx)
            .await
            .map_err(|_| {
                tracing::warn!(
                    channel_id = %self.channel_id,
                    message_id = %message_id,
                    request_pos = ?request_pos,
                    preview_id = ?preview_id,
                    timeout_ms = ACTION_RESPONSE_TIMEOUT.as_millis(),
                    "ChannelPosHandle::sending_new_message: timeout waiting actor response"
                );
                ChannelPosError::Timeout
            })?
            .map_err(|_| ChannelPosError::ActorShutdown)
    }

    pub(crate) async fn on_conflict(
        &self,
        message_id: Uuid,
        tail: Option<TailPosition>,
    ) -> Result<PositionAllocation, ChannelPosError> {
        let (tx, rx) = oneshot::channel();
        self.send(PosAction::OnConflict {
            message_id,
            tail,
            respond_to: tx,
        })
        .await?;

        tokio::time::timeout(ACTION_RESPONSE_TIMEOUT, rx)
            .await
            .map_err(|_| {
                tracing::warn!(
                    channel_id = %self.channel_id,
                    message_id = %message_id,
                    timeout_ms = ACTION_RESPONSE_TIMEOUT.as_millis(),
                    "ChannelPosHandle::on_conflict: timeout waiting actor response"
                );
                ChannelPosError::Timeout
            })?
            .map_err(|_| ChannelPosError::ActorShutdown)
    }

    pub(crate) async fn apply_persisted_tail(
        &self,
        tail: Option<TailPosition>,
    ) -> Result<(), ChannelPosError> {
        let (tx, rx) = oneshot::channel();
        self.send(PosAction::ApplyPersistedTail {
            tail,
            respond_to: tx,
        })
        .await?;
        tokio::time::timeout(ACTION_RESPONSE_TIMEOUT, rx)
            .await
            .map_err(|_| {
                tracing::warn!(
                    channel_id = %self.channel_id,
                    timeout_ms = ACTION_RESPONSE_TIMEOUT.as_millis(),
                    "ChannelPosHandle::apply_persisted_tail: timeout waiting actor response"
                );
                ChannelPosError::Timeout
            })?
            .map_err(|_| ChannelPosError::ActorShutdown)
    }

    pub(crate) async fn is_initialized(&self) -> Result<bool, ChannelPosError> {
        let (tx, rx) = oneshot::channel();
        self.send(PosAction::IsInitialized { respond_to: tx })
            .await?;
        tokio::time::timeout(ACTION_RESPONSE_TIMEOUT, rx)
            .await
            .map_err(|_| {
                tracing::warn!(
                    channel_id = %self.channel_id,
                    timeout_ms = ACTION_RESPONSE_TIMEOUT.as_millis(),
                    "ChannelPosHandle::is_initialized: timeout waiting actor response"
                );
                ChannelPosError::Timeout
            })?
            .map_err(|_| ChannelPosError::ActorShutdown)
    }

    pub(crate) fn submitted(
        &self,
        item_id: Uuid,
        pos_p: i32,
        pos_q: i32,
        old_item_id: Option<Uuid>,
    ) {
        self.send_nonblocking(PosAction::Submitted {
            item_id,
            pos_p,
            pos_q,
            old_item_id,
        });
    }

    pub(crate) fn cancel(&self, item_id: Uuid) {
        self.send_nonblocking(PosAction::Cancel { item_id });
    }

    fn shutdown(&self) {
        self.send_nonblocking(PosAction::Shutdown);
    }

    fn tick(&self) -> bool {
        if self.sender.is_closed() {
            return false;
        }
        !matches!(
            self.sender.try_send(PosAction::Tick),
            Err(tokio::sync::mpsc::error::TrySendError::Closed(_))
        )
    }
}

pub(crate) struct ChannelPosManager {
    actors: PapayaHashMap<Uuid, ChannelPosHandle, RandomState>,
}

impl ChannelPosManager {
    fn new() -> Self {
        let manager = Self {
            actors: PapayaHashMap::builder()
                .capacity(1024)
                .hasher(RandomState::new())
                .build(),
        };
        let span = tracing::info_span!(parent: None, "channel_pos_manager_tick");
        tokio::spawn(
            async move {
                let mut interval = crate::utils::cleaner_interval(TICK_INTERVAL.as_secs());
                loop {
                    interval.tick().await;
                    CHANNEL_POS_MANAGER.tick();
                }
            }
            .instrument(span),
        );
        manager
    }

    pub(crate) fn get_or_create_handle(&self, channel_id: Uuid) -> ChannelPosHandle {
        let actors = self.actors.pin();
        let result = actors.compute(channel_id, |entry| {
            if let Some((_, handle)) = entry {
                if !handle.sender.is_closed() {
                    return papaya::Operation::Abort(handle.clone());
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
            papaya::Operation::Insert(ChannelPosHandle {
                channel_id,
                sender,
                tail_sync: Arc::new(Mutex::new(())),
            })
        });
        match result {
            papaya::Compute::Aborted(handle) => handle,
            papaya::Compute::Updated {
                new: (_, handle), ..
            } => handle.clone(),
            papaya::Compute::Inserted(_, handle) => handle.clone(),
            papaya::Compute::Removed(_, _) => unreachable!(),
        }
    }

    pub(crate) fn submitted(
        &self,
        channel_id: Uuid,
        item_id: Uuid,
        pos_p: i32,
        pos_q: i32,
        old_item_id: Option<Uuid>,
    ) {
        self.get_or_create_handle(channel_id)
            .submitted(item_id, pos_p, pos_q, old_item_id);
    }

    pub(crate) fn cancel(&self, channel_id: Uuid, item_id: Uuid) {
        self.get_or_create_handle(channel_id).cancel(item_id);
    }

    pub(crate) fn shutdown(&self, channel_id: Uuid) {
        let handle = {
            let actors = self.actors.pin();
            actors.remove(&channel_id).cloned()
        };

        if let Some(handle) = handle {
            handle.shutdown();
        }
    }

    fn tick(&self) {
        let actors = self.actors.pin();
        actors.retain(|_, handle| handle.tick());
    }

    pub(crate) fn actor_count(&self) -> usize {
        self.actors.pin().len()
    }
}

pub(crate) static CHANNEL_POS_MANAGER: LazyLock<ChannelPosManager> =
    LazyLock::new(ChannelPosManager::new);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PosItemState {
    LiveIn(std::time::Duration),
    Submitting,
    Submitted,
}

#[derive(Debug, Clone)]
struct PosItem {
    id: Uuid,
    state: PosItemState,
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
    fn pos_available(&self, now: Instant) -> bool {
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
/// - https://en.oi-wiki.org/math/stern-brocot/
pub fn find_intermediate(
    mut p1: i32,
    mut q1: i32,
    mut p2: i32,
    mut q2: i32,
) -> Result<(i32, i32), FailToFindIntermediate> {
    use FailToFindIntermediate::{EqualFractions, OutOfRange};
    // It is safe to multiply two i32 and store in i64/i128 for comparisons.
    let mut p1_q2 = (p1 as i64) * (q2 as i64);
    let mut p2_q1 = (p2 as i64) * (q1 as i64);
    // Two fractions are equal only if p1*q2 == p2*q1
    if p1_q2 == p2_q1 {
        return Err(EqualFractions);
    }

    // Ensure the interval is ordered ascending; if reversed, swap to avoid
    // non-terminating search behavior.
    if p1_q2 > p2_q1 {
        // Swap (p1/q1) and (p2/q2)
        std::mem::swap(&mut p1, &mut p2);
        std::mem::swap(&mut q1, &mut q2);
        std::mem::swap(&mut p1_q2, &mut p2_q1);
    }

    // Check if they are Farey neighbors
    if p1_q2 + 1 == p2_q1 {
        let p_sum: i32 = p1.checked_add(p2).ok_or(OutOfRange)?;
        let q_sum: i32 = q1.checked_add(q2).ok_or(OutOfRange)?;
        // Returns mediant
        return Ok((p_sum, q_sum));
    }

    // Accelerated Stern–Brocot binary search with jump counts.
    // Maintain neighbors low = (left_p/left_q) and high = (right_p/right_q).
    let mut left_p: i128 = 0;
    let mut left_q: i128 = 1;
    let mut right_p: i128 = 1;
    let mut right_q: i128 = 0;

    let p1 = p1 as i128;
    let q1 = q1 as i128;
    let p2 = p2 as i128;
    let q2 = q2 as i128;

    // Jump until mediant lies strictly between (p1/q1, p2/q2)
    loop {
        // mediant m = (ln+rn)/(ld+rd)
        let mediant_p: i128 = left_p + right_p;
        let mediant_q: i128 = left_q + right_q;

        // Is mediant_p/mediant_q <= p1/q1
        if mediant_p * q1 <= p1 * mediant_q {
            // Move low upward by t steps: low = low + t * high
            // Find maximum t such that (low + t*high) <= p1/q1.
            // Derivation:
            // (ln + t*rn)/(ld + t*rd) <= p1/q1
            // => t * (rn*q1 - p1*rd) <= p1*ld - ln*q1
            let a = right_p * q1 - p1 * right_q; // strictly > 0 in this branch
            let b = p1 * left_q - left_p * q1; // >= 0
            debug_assert!(a > 0 && b >= 0);
            let mut t = b / a; // floor
            if t < 1 {
                t = 1; // be defensive; though branch condition implies t >= 1
            }
            left_p += t * right_p;
            left_q += t * right_q;
            continue;
        }

        // Is p2/q2 <= mediant_p/mediant_q
        if p2 * mediant_q <= mediant_p * q2 {
            // Move high downward by t steps: high = high + t * low
            // Find maximum t such that p2/q2 <= (high + t*low)
            // => t * (p2*ld - q2*ln) <= q2*rn - p2*rd
            let c = p2 * left_q - q2 * left_p; // >= 0
            let d = q2 * right_p - p2 * right_q; // >= 0, and d >= c in this branch
            debug_assert!(d >= c);
            let mut t = if c == 0 { d } else { d / c }; // when c==0, take all d steps
            if t < 1 {
                t = 1; // be defensive
            }
            right_p += t * left_p;
            right_q += t * left_q;
            continue;
        }

        return Ok((
            mediant_p.try_into().map_err(|_| OutOfRange)?,
            mediant_q.try_into().map_err(|_| OutOfRange)?,
        ));
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

    #[test]
    fn test_equal_fractions_unreduced_2_4_1_2() {
        // 2/4 == 1/2 should be detected as equal
        assert_eq!(
            find_intermediate(2, 4, 1, 2),
            Err(FailToFindIntermediate::EqualFractions)
        );
    }

    // Potential edge case: reversed inputs could cause non-terminating search
    // in naive implementations. Ensure it still returns a valid intermediate.
    #[test]
    fn test_reversed_order_2_3_1_2() {
        let res = find_intermediate(2, 3, 1, 2).expect("should find intermediate");
        // Should be 3/5 between 1/2 and 2/3
        assert_eq!(res, (3, 5));
    }

    #[test]
    fn test_reversed_order_0_1_1_3() {
        // Between 0/1 and 1/3, mediant is 1/4; also check reversed order handling
        let direct = find_intermediate(0, 1, 1, 3).expect("should find intermediate");
        let reversed = find_intermediate(1, 3, 0, 1).expect("should find intermediate");
        assert_eq!(direct, (1, 4));
        assert_eq!(direct, reversed);
    }

    // Close but non-neighbor fractions: ensures the loop path is exercised
    // (if implemented), and still returns a valid intermediate.
    #[test]
    fn test_close_non_neighbors_large_denoms() {
        // These are close but not neighbors.
        let (p1, q1) = (500_000_000, 1_000_000_001);
        let (p2, q2) = (500_000_001, 1_000_000_002);
        let (p, q) = find_intermediate(p1, q1, p2, q2).expect("should find intermediate");
        // Validate p/q is strictly between p1/q1 and p2/q2 to avoid false positives
        // due to direction/order.
        let left = num_rational::Rational32::new(p1, q1);
        let right = num_rational::Rational32::new(p2, q2);
        let mid = num_rational::Rational32::new(p, q);
        let (lo, hi) = if left <= right {
            (left, right)
        } else {
            (right, left)
        };
        assert!(
            lo < mid && mid < hi,
            "intermediate not strictly between bounds"
        );
    }

    #[test]
    fn test_neighbors_overflow_out_of_range() {
        // Choose Farey neighbors where mediant denominator overflows i32:
        // a = 2147483646/2147483647, b = 1/1 are neighbors because
        // a_p*b_q + 1 == b_p*a_q  => 2147483646*1 + 1 == 1*2147483647
        // Mediant would be (2147483647, 2147483648) which doesn't fit in i32
        let a = (2_147_483_646, 2_147_483_647);
        let b = (1, 1);
        let err = find_intermediate(a.0, a.1, b.0, b.1).unwrap_err();
        assert_eq!(err, FailToFindIntermediate::OutOfRange);
    }

    #[test]
    fn test_result_is_reduced_gcd_is_one() {
        fn gcd(mut a: i32, mut b: i32) -> i32 {
            if a < 0 {
                a = -a;
            }
            if b < 0 {
                b = -b;
            }
            while b != 0 {
                let t = a % b;
                a = b;
                b = t;
            }
            a
        }
        let cases = [
            ((0, 1), (1, 2)),
            ((1, 3), (2, 5)),
            ((3, 7), (4, 9)),
            ((7, 10), (9, 11)),
        ];
        for &((p1, q1), (p2, q2)) in &cases {
            let (p, q) = find_intermediate(p1, q1, p2, q2).expect("should find intermediate");
            assert_eq!(
                gcd(p, q),
                1,
                "result not in lowest terms for inputs {p1}/{q1} and {p2}/{q2}"
            );
            // Also assert strictly between
            let a = num_rational::Rational32::new(p1, q1);
            let b = num_rational::Rational32::new(p2, q2);
            let m = num_rational::Rational32::new(p, q);
            let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
            assert!(lo < m && m < hi);
        }
    }

    #[test]
    fn submitted_observation_does_not_initialize_position_state() {
        let mut state = ChannelPosState::new();
        state.submitted(Uuid::new_v4(), 100, 1, None);

        assert!(!state.is_initialized());
        assert_eq!(
            state.sending_new_message(Uuid::new_v4(), None, None),
            PositionAllocation::NeedsPersistedTail
        );
    }

    #[test]
    fn client_requested_position_must_leave_allocation_headroom() {
        assert!(check_request_pos((MAX_REQUEST_POSITION, 1)).is_ok());
        assert!(check_request_pos((MAX_REQUEST_POSITION + 1, 1)).is_err());
        assert!(check_request_pos((MAX_REQUEST_POSITION * 2, 2)).is_ok());
        assert!(check_request_pos((MAX_REQUEST_POSITION * 2 + 1, 2)).is_err());
        assert!(check_request_pos((i32::MAX, i32::MAX)).is_ok());
        assert!(check_request_pos((i32::MAX, 1)).is_err());

        assert!(check_pos((MAX_REQUEST_POSITION + 1, 1)).is_ok());
        assert!(check_pos((i32::MAX, 1)).is_ok());
    }

    #[test]
    fn next_position_uses_wide_arithmetic() {
        let mut state = ChannelPosState::new();
        state.apply_persisted_tail(Some(TailPosition {
            id: Uuid::new_v4(),
            pos_p: i32::MAX,
            pos_q: 2,
        }));

        assert_eq!(
            state.sending_new_message(Uuid::new_v4(), None, None),
            PositionAllocation::Reserved(Rational32::new(1_073_741_825, 1))
        );
    }

    #[test]
    fn exhausted_position_range_does_not_wrap() {
        let mut state = ChannelPosState::new();
        state.apply_persisted_tail(Some(TailPosition {
            id: Uuid::new_v4(),
            pos_p: i32::MAX,
            pos_q: 1,
        }));

        assert_eq!(
            state.preview_pos(Uuid::new_v4(), Duration::from_secs(30)),
            PositionAllocation::Exhausted
        );
    }

    #[test]
    fn persisted_tail_merges_with_observed_positions() {
        let mut state = ChannelPosState::new();
        let observed_id = Uuid::new_v4();
        let reservation_id = Uuid::new_v4();
        state.submitted(observed_id, 100, 1, None);
        assert_eq!(
            state.sending_new_message(reservation_id, Some((110, 1)), None),
            PositionAllocation::Reserved(Rational32::new(110, 1))
        );
        state.apply_persisted_tail(Some(TailPosition {
            id: Uuid::new_v4(),
            pos_p: 80,
            pos_q: 1,
        }));
        state.delete_by_id(observed_id);
        state.delete_by_id(reservation_id);

        assert!(state.is_initialized());
        assert_eq!(
            state.sending_new_message(Uuid::new_v4(), None, None),
            PositionAllocation::Reserved(Rational32::new(111, 1))
        );
    }

    #[test]
    fn empty_channel_tail_remains_monotonic_after_cancel() {
        let mut state = ChannelPosState::new();
        state.apply_persisted_tail(None);
        let message_id = Uuid::new_v4();
        assert_eq!(
            state.sending_new_message(message_id, None, None),
            PositionAllocation::Reserved(Rational32::new(43, 1))
        );
        state.delete_by_id(message_id);

        assert_eq!(
            state.preview_pos(Uuid::new_v4(), Duration::from_secs(30)),
            PositionAllocation::Reserved(Rational32::new(44, 1))
        );
    }

    #[test]
    fn submitting_timeout_does_not_reuse_position() {
        let mut state = ChannelPosState::new();
        state.apply_persisted_tail(None);
        assert_eq!(
            state.sending_new_message(Uuid::new_v4(), None, None),
            PositionAllocation::Reserved(Rational32::new(43, 1))
        );

        let after_timeout = Instant::now() + SUBMITTING_TIMEOUT + Duration::from_secs(1);
        state
            .positions
            .retain(|_, pos_item| !pos_item.pos_available(after_timeout));

        assert_eq!(
            state.sending_new_message(Uuid::new_v4(), None, None),
            PositionAllocation::Reserved(Rational32::new(44, 1))
        );
    }

    #[test]
    fn conflict_reconciliation_advances_from_database_tail() {
        let mut state = ChannelPosState::new();
        state.apply_persisted_tail(None);
        let message_id = Uuid::new_v4();
        assert_eq!(
            state.sending_new_message(message_id, None, None),
            PositionAllocation::Reserved(Rational32::new(43, 1))
        );

        let reconciled = state.on_conflict(
            message_id,
            Some(TailPosition {
                id: Uuid::new_v4(),
                pos_p: 75,
                pos_q: 1,
            }),
        );
        assert_eq!(
            reconciled,
            PositionAllocation::Reserved(Rational32::new(76, 1))
        );
    }

    #[tokio::test]
    async fn shutdown_isolates_actor_generation() {
        let channel_id = Uuid::new_v4();
        let old_handle = CHANNEL_POS_MANAGER.get_or_create_handle(channel_id);
        old_handle
            .apply_persisted_tail(None)
            .await
            .expect("failed to initialize old actor");

        CHANNEL_POS_MANAGER.shutdown(channel_id);
        let new_handle = CHANNEL_POS_MANAGER.get_or_create_handle(channel_id);

        assert!(
            old_handle
                .apply_persisted_tail(Some(TailPosition {
                    id: Uuid::new_v4(),
                    pos_p: 100,
                    pos_q: 1,
                }))
                .await
                .is_err()
        );
        assert!(
            !new_handle
                .is_initialized()
                .await
                .expect("new actor shut down")
        );

        CHANNEL_POS_MANAGER.shutdown(channel_id);
    }
}
