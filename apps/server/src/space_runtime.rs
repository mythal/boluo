use std::collections::{HashMap, VecDeque};
use std::future::Future;
use std::sync::atomic::{AtomicBool, AtomicI64, AtomicU64, Ordering};
use std::sync::{Arc, Weak};
use std::time::{Duration, Instant};

use arc_swap::ArcSwap;
use chrono::{DateTime, TimeZone, Utc};
use tokio::sync::{mpsc, oneshot};
use uuid::Uuid;

use crate::channels::models::Member;
use crate::channels::{Channel, ChannelMember};
use crate::characters::Character;
use crate::spaces::{Space, SpaceMember};

type PersistentMap<K, V> = rpds::HashTrieMapSync<K, V>;

const MAINTENANCE_INTERVAL: Duration = Duration::from_secs(60);
const SNAPSHOT_MAX_AGE: Duration = Duration::from_secs(10 * 60);
const RUNTIME_MAX_IDLE: Duration = Duration::from_secs(30 * 60);
const MAX_CONCURRENT_RECONCILIATIONS: usize = 2;
const MAX_QUEUED_MUTATIONS: u64 = 64;
const AUTHORITATIVE_SNAPSHOT_WAIT: Duration = Duration::from_millis(3);

#[derive(Debug, Clone)]
pub(crate) struct SpaceSnapshot {
    pub(crate) revision: u64,
    verified_at: Instant,
    space: Space,
    latest_activity_us: Arc<AtomicI64>,
    pub(crate) settings: serde_json::Value,
    pub(crate) channels: PersistentMap<Uuid, Channel>,
    pub(crate) characters: PersistentMap<Uuid, Character>,
    pub(crate) space_members: PersistentMap<Uuid, SpaceMember>,
    pub(crate) channel_members: PersistentMap<Uuid, PersistentMap<Uuid, ChannelMember>>,
}

#[derive(Debug, Default, PartialEq, Eq)]
struct SnapshotPayloadMismatch {
    space: bool,
    settings: bool,
    channels: bool,
    characters: bool,
    space_members: bool,
    channel_members: bool,
}

impl SnapshotPayloadMismatch {
    fn any(&self) -> bool {
        self.space
            || self.settings
            || self.channels
            || self.characters
            || self.space_members
            || self.channel_members
    }
}

#[derive(Debug, Clone)]
pub(crate) enum SpaceDelta {
    SpaceUpdated(Space),
    SettingsUpdated(serde_json::Value),
    InviteTokenUpdated(Uuid),
    ChannelUpserted(Channel),
    ChannelDeleted(Uuid),
    CharacterUpserted(Character),
    CharacterDeleted(Uuid),
    SpaceMemberUpserted(SpaceMember),
    SpaceMemberRemoved {
        user_id: Uuid,
        channel_ids: Vec<Uuid>,
    },
    ChannelMemberUpserted(ChannelMember),
    ChannelMemberRemoved {
        channel_id: Uuid,
        user_id: Uuid,
    },
}

impl SpaceSnapshot {
    pub(crate) fn space(&self) -> Space {
        let mut space = self.space.clone();
        space.latest_activity = Utc
            .timestamp_micros(self.latest_activity_us.load(Ordering::Relaxed))
            .single()
            .expect("Space latest_activity must be a valid UTC timestamp");
        space
    }

    pub(crate) fn channel_member(&self, channel_id: Uuid, user_id: Uuid) -> Option<Member> {
        let channel = self
            .channel_members
            .get(&channel_id)?
            .get(&user_id)?
            .clone();
        let space = self.space_members.get(&user_id)?.clone();
        Some(Member { channel, space })
    }

    pub(crate) fn members_in_channel(&self, channel_id: Uuid) -> Vec<Member> {
        self.channel_members
            .get(&channel_id)
            .into_iter()
            .flat_map(|members| members.values())
            .filter_map(|channel| {
                self.space_members
                    .get(&channel.user_id)
                    .map(|space| Member {
                        channel: channel.clone(),
                        space: space.clone(),
                    })
            })
            .collect()
    }

    fn payload_mismatch(&self, reloaded: &Self) -> SnapshotPayloadMismatch {
        let mut current_space = self.space.clone();
        let reloaded_space = reloaded.space.clone();
        // Activity is updated eagerly in memory and persisted asynchronously. It is
        // intentionally excluded from structural cache-consistency reporting.
        current_space.latest_activity = reloaded_space.latest_activity;

        SnapshotPayloadMismatch {
            space: current_space != reloaded_space,
            settings: self.settings != reloaded.settings,
            channels: self.channels != reloaded.channels,
            characters: self.characters != reloaded.characters,
            space_members: self.space_members != reloaded.space_members,
            channel_members: self.channel_members != reloaded.channel_members,
        }
    }

    fn apply_deltas(&self, revision: u64, deltas: Vec<SpaceDelta>) -> Self {
        let mut next = self.clone();
        next.revision = revision;
        for delta in deltas {
            match delta {
                SpaceDelta::SpaceUpdated(space) => next.space = space,
                SpaceDelta::SettingsUpdated(settings) => next.settings = settings,
                SpaceDelta::InviteTokenUpdated(token) => next.space.invite_token = token,
                SpaceDelta::ChannelUpserted(channel) => {
                    next.channels.insert_mut(channel.id, channel);
                }
                SpaceDelta::ChannelDeleted(channel_id) => {
                    next.channels.remove_mut(&channel_id);
                    next.channel_members.remove_mut(&channel_id);
                }
                SpaceDelta::CharacterUpserted(character) => {
                    next.characters.insert_mut(character.id, character);
                }
                SpaceDelta::CharacterDeleted(character_id) => {
                    next.characters.remove_mut(&character_id);
                }
                SpaceDelta::SpaceMemberUpserted(member) => {
                    next.space_members.insert_mut(member.user_id, member);
                }
                SpaceDelta::SpaceMemberRemoved {
                    user_id,
                    channel_ids,
                } => {
                    next.space_members.remove_mut(&user_id);
                    for channel_id in channel_ids {
                        if let Some(mut members) = next.channel_members.get(&channel_id).cloned() {
                            members.remove_mut(&user_id);
                            if members.size() == 0 {
                                next.channel_members.remove_mut(&channel_id);
                            } else {
                                next.channel_members.insert_mut(channel_id, members);
                            }
                        }
                    }
                }
                SpaceDelta::ChannelMemberUpserted(member) => {
                    if member.is_joined {
                        let mut members = next
                            .channel_members
                            .get(&member.channel_id)
                            .cloned()
                            .unwrap_or_else(PersistentMap::new_sync);
                        members.insert_mut(member.user_id, member.clone());
                        next.channel_members.insert_mut(member.channel_id, members);
                    } else if let Some(mut members) =
                        next.channel_members.get(&member.channel_id).cloned()
                    {
                        members.remove_mut(&member.user_id);
                        if members.size() == 0 {
                            next.channel_members.remove_mut(&member.channel_id);
                        } else {
                            next.channel_members.insert_mut(member.channel_id, members);
                        }
                    }
                }
                SpaceDelta::ChannelMemberRemoved {
                    channel_id,
                    user_id,
                } => {
                    if let Some(mut members) = next.channel_members.get(&channel_id).cloned() {
                        members.remove_mut(&user_id);
                        if members.size() == 0 {
                            next.channel_members.remove_mut(&channel_id);
                        } else {
                            next.channel_members.insert_mut(channel_id, members);
                        }
                    }
                }
            }
        }
        next
    }
}

pub(crate) struct ResolvedChannel {
    pub(crate) channel: Channel,
    pub(crate) snapshot: Option<Arc<SpaceSnapshot>>,
}

#[derive(Debug, thiserror::Error)]
pub(crate) enum SpaceRuntimeError {
    #[error("space not found")]
    NotFound,
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    #[error("space runtime control queue is closed")]
    Closed,
    #[error("space runtime mutation queue is full")]
    Busy,
}

pub(crate) struct SpaceRuntime {
    space_id: Uuid,
    db: sqlx::PgPool,
    snapshot: ArcSwap<SpaceSnapshot>,
    dirty: AtomicBool,
    next_ticket: AtomicU64,
    reconciliation_pending: AtomicBool,
    authoritative_notify: tokio::sync::Notify,
    control_tx: mpsc::Sender<ControlCommand>,
    active_mutations: AtomicU64,
}

impl SpaceRuntime {
    async fn load(db: &sqlx::PgPool, space_id: Uuid) -> Result<Arc<Self>, SpaceRuntimeError> {
        let started = Instant::now();
        let result = Self::load_snapshot(db, space_id, 0).await;
        metrics::histogram!("boluo_server_space_runtime_load_duration_seconds")
            .record(started.elapsed().as_secs_f64());
        if result.is_err() {
            metrics::counter!("boluo_server_space_runtime_load_failed_total").increment(1);
        }
        let snapshot = result?;
        let (control_tx, control_rx) = mpsc::channel(96);
        let runtime = Arc::new(Self {
            space_id,
            db: db.clone(),
            snapshot: ArcSwap::from_pointee(snapshot),
            dirty: AtomicBool::new(false),
            next_ticket: AtomicU64::new(0),
            reconciliation_pending: AtomicBool::new(false),
            authoritative_notify: tokio::sync::Notify::new(),
            control_tx,
            active_mutations: AtomicU64::new(0),
        });
        tokio::spawn(Self::run_control(Arc::downgrade(&runtime), control_rx));
        Ok(runtime)
    }

    async fn load_snapshot(
        db: &sqlx::PgPool,
        space_id: Uuid,
        revision: u64,
    ) -> Result<SpaceSnapshot, SpaceRuntimeError> {
        let mut transaction = db.begin().await?;
        sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
            .execute(&mut *transaction)
            .await?;

        let space = sqlx::query_file_scalar!("sql/spaces/get_by_id.sql", space_id)
            .fetch_optional(&mut *transaction)
            .await?
            .ok_or(SpaceRuntimeError::NotFound)?;
        let settings = sqlx::query_file_scalar!("sql/spaces/get_settings.sql", space_id)
            .fetch_optional(&mut *transaction)
            .await?
            .unwrap_or_else(|| serde_json::json!({}));
        let channels = sqlx::query_file_scalar!("sql/channels/get_by_space.sql", space_id)
            .fetch_all(&mut *transaction)
            .await?;
        let characters = sqlx::query_file_scalar!("sql/characters/list_by_space.sql", space_id)
            .fetch_all(&mut *transaction)
            .await?;
        let space_members =
            sqlx::query_file_scalar!("sql/spaces/get_members_by_space.sql", space_id)
                .fetch_all(&mut *transaction)
                .await?;
        let channel_members =
            sqlx::query_file_scalar!("sql/channels/get_joined_members_by_space.sql", space_id)
                .fetch_all(&mut *transaction)
                .await?;
        transaction.commit().await?;

        let channels: PersistentMap<_, _> = channels
            .into_iter()
            .map(|channel: Channel| (channel.id, channel))
            .collect();
        let characters: PersistentMap<_, _> = characters
            .into_iter()
            .map(|character: Character| (character.id, character))
            .collect();
        let space_members: PersistentMap<_, _> = space_members
            .into_iter()
            .map(|member: SpaceMember| (member.user_id, member))
            .collect();
        let mut channel_members_by_channel = HashMap::new();
        for member in channel_members {
            let members: &mut HashMap<Uuid, ChannelMember> = channel_members_by_channel
                .entry(member.channel_id)
                .or_insert_with(HashMap::new);
            members.insert(member.user_id, member);
        }
        let channel_members: PersistentMap<_, _> = channel_members_by_channel
            .into_iter()
            .map(|(channel_id, members)| {
                (
                    channel_id,
                    members.into_iter().collect::<PersistentMap<_, _>>(),
                )
            })
            .collect();

        let latest_activity = space.latest_activity;
        Ok(SpaceSnapshot {
            revision,
            verified_at: Instant::now(),
            space,
            latest_activity_us: Arc::new(AtomicI64::new(latest_activity.timestamp_micros())),
            settings,
            channels,
            characters,
            space_members,
            channel_members,
        })
    }

    pub(crate) fn space_id(&self) -> Uuid {
        self.space_id
    }

    pub(crate) fn snapshot(&self) -> Arc<SpaceSnapshot> {
        self.snapshot.load_full()
    }

    fn record_latest_activity(&self, update_time: DateTime<Utc>) {
        self.snapshot()
            .latest_activity_us
            .fetch_max(update_time.timestamp_micros(), Ordering::Relaxed);
    }

    /// Returns a snapshot only while it is known to include every queued committed change.
    pub(crate) fn authoritative_snapshot(&self) -> Option<Arc<SpaceSnapshot>> {
        if self.dirty.load(Ordering::Acquire) {
            return None;
        }
        let snapshot = self.snapshot();
        (!self.dirty.load(Ordering::Acquire)).then_some(snapshot)
    }

    async fn authoritative_snapshot_after_wait(&self) -> Option<Arc<SpaceSnapshot>> {
        self.authoritative_snapshot_after(AUTHORITATIVE_SNAPSHOT_WAIT)
            .await
    }

    async fn authoritative_snapshot_after(&self, max_wait: Duration) -> Option<Arc<SpaceSnapshot>> {
        if let Some(snapshot) = self.authoritative_snapshot() {
            return Some(snapshot);
        }

        let notified = self.authoritative_notify.notified();
        tokio::pin!(notified);
        notified.as_mut().enable();
        if let Some(snapshot) = self.authoritative_snapshot() {
            return Some(snapshot);
        }

        let started = Instant::now();
        let _ = tokio::time::timeout(max_wait, notified.as_mut()).await;
        let snapshot = self.authoritative_snapshot();
        metrics::histogram!("boluo_server_space_runtime_read_wait_duration_seconds")
            .record(started.elapsed().as_secs_f64());
        metrics::counter!(
            "boluo_server_space_runtime_read_wait_total",
            "result" => if snapshot.is_some() { "recovered" } else { "timeout" }
        )
        .increment(1);
        snapshot
    }

    async fn refresh_committed(&self) -> Result<u64, SpaceRuntimeError> {
        let (ticket, ack_rx) = self.enqueue_refresh(None)?;
        ack_rx.await.unwrap_or(Err(SpaceRuntimeError::Closed))?;
        Ok(ticket)
    }

    async fn apply_committed_deltas(
        &self,
        mutation_token: u64,
        deltas: Vec<SpaceDelta>,
    ) -> Result<u64, SpaceRuntimeError> {
        // The database commit already happened. Hide the old snapshot before waiting
        // for the control actor, even if this proof later turns out to be stale.
        self.dirty.store(true, Ordering::Release);
        let (ack_tx, ack_rx) = oneshot::channel();
        self.control_tx
            .send(ControlCommand::ApplyCommitted {
                mutation_token,
                deltas,
                ack: ack_tx,
            })
            .await
            .map_err(|_| SpaceRuntimeError::Closed)?;
        ack_rx.await.unwrap_or(Err(SpaceRuntimeError::Closed))
    }

    fn enqueue_refresh(
        &self,
        reconciliation_permit: Option<tokio::sync::OwnedSemaphorePermit>,
    ) -> Result<(u64, oneshot::Receiver<Result<u64, SpaceRuntimeError>>), SpaceRuntimeError> {
        let ticket = self.next_ticket.fetch_add(1, Ordering::AcqRel) + 1;
        self.dirty.store(true, Ordering::Release);
        self.enqueue_refresh_command(ticket, reconciliation_permit)
    }

    fn enqueue_reconciliation(
        &self,
        reconciliation_permit: tokio::sync::OwnedSemaphorePermit,
    ) -> Result<(u64, oneshot::Receiver<Result<u64, SpaceRuntimeError>>), SpaceRuntimeError> {
        // Reconciliation is a best-effort verification, not evidence of a committed
        // change. Keep serving the current snapshot while the actor reloads it.
        let ticket = self.next_ticket.load(Ordering::Acquire);
        self.enqueue_refresh_command(ticket, Some(reconciliation_permit))
    }

    fn enqueue_refresh_command(
        &self,
        ticket: u64,
        reconciliation_permit: Option<tokio::sync::OwnedSemaphorePermit>,
    ) -> Result<(u64, oneshot::Receiver<Result<u64, SpaceRuntimeError>>), SpaceRuntimeError> {
        let (ack_tx, ack_rx) = oneshot::channel();
        let command = RefreshCommand {
            ticket,
            ack: ack_tx,
            reconciliation_permit,
        };
        match self.control_tx.try_send(ControlCommand::Refresh(command)) {
            Ok(()) => {}
            Err(mpsc::error::TrySendError::Full(command)) => {
                // The enqueue operation must outlive its request or maintenance tick.
                let tx = self.control_tx.clone();
                tokio::spawn(async move {
                    let _ = tx.send(command).await;
                });
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {
                metrics::counter!("boluo_server_space_runtime_refresh_failed_total").increment(1);
                return Err(SpaceRuntimeError::Closed);
            }
        }
        Ok((ticket, ack_rx))
    }

    fn needs_reconciliation(&self, max_age: Duration) -> bool {
        self.active_mutations.load(Ordering::Acquire) == 0
            && !self.reconciliation_pending.load(Ordering::Acquire)
            && self.snapshot().verified_at.elapsed() >= max_age
    }

    fn reconcile_if_stale(&self, max_age: Duration, permits: &Arc<tokio::sync::Semaphore>) -> bool {
        if !self.needs_reconciliation(max_age) {
            return false;
        }
        if self
            .reconciliation_pending
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_err()
        {
            return false;
        }
        let Ok(permit) = permits.clone().try_acquire_owned() else {
            self.reconciliation_pending.store(false, Ordering::Release);
            return false;
        };
        match self.enqueue_reconciliation(permit) {
            Ok((_ticket, ack_rx)) => {
                // The control actor and its permit outlive this maintenance tick.
                drop(ack_rx);
                metrics::counter!("boluo_server_space_runtime_reconciliation_scheduled_total")
                    .increment(1);
                true
            }
            Err(error) => {
                self.reconciliation_pending.store(false, Ordering::Release);
                metrics::counter!("boluo_server_space_runtime_reconciliation_failed_total")
                    .increment(1);
                tracing::error!(
                    %error,
                    space_id = %self.space_id,
                    "Failed to enqueue Space runtime reconciliation"
                );
                false
            }
        }
    }

    fn reserve_generation(&self) -> u64 {
        // Invalidate synchronously before the corresponding control command is queued.
        // An older publication must not make this snapshot authoritative again.
        let ticket = self.next_ticket.fetch_add(1, Ordering::AcqRel) + 1;
        self.dirty.store(true, Ordering::Release);
        ticket
    }

    async fn acquire_mutation(self: &Arc<Self>) -> Result<SpaceMutationGuard, SpaceRuntimeError> {
        let active_mutations = self.active_mutations.fetch_add(1, Ordering::AcqRel);
        if active_mutations > MAX_QUEUED_MUTATIONS {
            self.active_mutations.fetch_sub(1, Ordering::AcqRel);
            metrics::counter!("boluo_server_space_runtime_mutation_rejected_total").increment(1);
            return Err(SpaceRuntimeError::Busy);
        }
        let (granted_tx, granted_rx) = oneshot::channel();
        let command = ControlCommand::BeginMutation {
            queued_at: Instant::now(),
            granted: granted_tx,
        };
        match self.control_tx.try_send(command) {
            Ok(()) => {}
            Err(mpsc::error::TrySendError::Full(command)) => {
                drop(command);
                self.active_mutations.fetch_sub(1, Ordering::AcqRel);
                metrics::counter!("boluo_server_space_runtime_mutation_rejected_total")
                    .increment(1);
                return Err(SpaceRuntimeError::Busy);
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {
                self.active_mutations.fetch_sub(1, Ordering::AcqRel);
                return Err(SpaceRuntimeError::Closed);
            }
        }
        let mutation_token = granted_rx.await.map_err(|_| SpaceRuntimeError::Closed)?;
        Ok(SpaceMutationGuard {
            runtime: Arc::downgrade(self),
            space_id: self.space_id,
            mutation_token,
        })
    }

    fn finish_mutation(&self, mutation_token: u64) {
        let command = ControlCommand::FinishMutation { mutation_token };
        match self.control_tx.try_send(command) {
            Ok(()) => {}
            Err(mpsc::error::TrySendError::Full(command)) => {
                let tx = self.control_tx.clone();
                tokio::spawn(async move {
                    let _ = tx.send(command).await;
                });
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {}
        }
    }

    async fn run_control(runtime: Weak<Self>, mut control_rx: mpsc::Receiver<ControlCommand>) {
        // This state machine serializes mutations only within this server process. A future
        // multi-node deployment must add database-backed or distributed per-Space coordination.
        let mut state = ControlState::default();
        while let Some(command) = control_rx.recv().await {
            let Some(runtime) = runtime.upgrade() else {
                break;
            };
            metrics::gauge!("boluo_server_space_runtime_control_queue_depth")
                .set(control_rx.len() as f64);
            match command {
                ControlCommand::BeginMutation { queued_at, granted } => {
                    state
                        .pending_mutations
                        .push_back(PendingMutation { queued_at, granted });
                    Self::grant_next_mutation(&runtime, &mut state).await;
                }
                ControlCommand::FinishMutation { mutation_token } => {
                    Self::finish_active_mutation(&runtime, &mut state, mutation_token).await;
                    Self::grant_next_mutation(&runtime, &mut state).await;
                }
                ControlCommand::ApplyCommitted {
                    mutation_token,
                    deltas,
                    ack,
                } => {
                    let result =
                        Self::apply_controlled_deltas(&runtime, &mut state, mutation_token, deltas)
                            .await;
                    let _ = ack.send(result);
                }
                ControlCommand::Refresh(command) => {
                    if let Some(active) = state.active_mutation.as_mut() {
                        active.base_revision = None;
                    }
                    let is_reconciliation = command.reconciliation_permit.is_some();
                    let result =
                        Self::reload_snapshot(&runtime, &state, command.ticket, is_reconciliation)
                            .await;
                    let _ = command.ack.send(result);
                    if is_reconciliation {
                        runtime
                            .reconciliation_pending
                            .store(false, Ordering::Release);
                    }
                }
            }
        }
    }

    async fn grant_next_mutation(runtime: &Arc<Self>, state: &mut ControlState) {
        while state.active_mutation.is_none() {
            let Some(command) = state.pending_mutations.pop_front() else {
                return;
            };
            metrics::histogram!("boluo_server_space_runtime_mutation_queue_wait_seconds")
                .record(command.queued_at.elapsed().as_secs_f64());
            metrics::gauge!("boluo_server_space_runtime_mutation_queue_depth")
                .set(state.pending_mutations.len() as f64);
            state.next_mutation_token += 1;
            let mutation_token = state.next_mutation_token;
            let current_revision = runtime.snapshot().revision;
            let generation = runtime.next_ticket.load(Ordering::Acquire);
            let was_authoritative =
                !runtime.dirty.load(Ordering::Acquire) && generation == current_revision;
            let reserved_ticket = runtime.reserve_generation();
            let base_revision = (was_authoritative && reserved_ticket == generation + 1)
                .then_some(current_revision);
            state.active_mutation = Some(ActiveMutation {
                mutation_token,
                base_revision,
                reserved_ticket,
                published: false,
                started_at: Instant::now(),
            });
            if command.granted.send(mutation_token).is_ok() {
                return;
            }

            runtime.active_mutations.fetch_sub(1, Ordering::AcqRel);
            state.active_mutation = None;
            let ticket = runtime.reserve_generation();
            let _ = Self::reload_snapshot(runtime, state, ticket, false).await;
        }
    }

    async fn finish_active_mutation(
        runtime: &Arc<Self>,
        state: &mut ControlState,
        mutation_token: u64,
    ) {
        let Some(active) = state.active_mutation.as_ref() else {
            return;
        };
        if active.mutation_token != mutation_token {
            tracing::warn!(
                space_id = %runtime.space_id,
                mutation_token,
                active_mutation_token = active.mutation_token,
                "Ignored completion for a non-active Space mutation"
            );
            return;
        }
        let started_at = active.started_at;
        let needs_repair = !active.published || runtime.dirty.load(Ordering::Acquire);
        state.active_mutation = None;
        runtime.active_mutations.fetch_sub(1, Ordering::AcqRel);
        metrics::histogram!("boluo_server_space_runtime_mutation_duration_seconds")
            .record(started_at.elapsed().as_secs_f64());
        if needs_repair {
            let ticket = runtime.reserve_generation();
            if let Err(error) = Self::reload_snapshot(runtime, state, ticket, false).await {
                tracing::error!(
                    %error,
                    space_id = %runtime.space_id,
                    mutation_token,
                    "Space runtime remains dirty after mutation recovery failure"
                );
            }
        }
    }

    async fn apply_controlled_deltas(
        runtime: &Arc<Self>,
        state: &mut ControlState,
        mutation_token: u64,
        deltas: Vec<SpaceDelta>,
    ) -> Result<u64, SpaceRuntimeError> {
        let current = runtime.snapshot();
        let can_apply_delta = state.active_mutation.as_ref().is_some_and(|active| {
            active.mutation_token == mutation_token
                && active.base_revision == Some(current.revision)
                && runtime.next_ticket.load(Ordering::Acquire) == active.reserved_ticket
        });
        if can_apply_delta {
            let ticket = runtime.reserve_generation();
            let next = current.apply_deltas(ticket, deltas);
            runtime.snapshot.store(Arc::new(next));
            if let Some(active) = state.active_mutation.as_mut() {
                active.base_revision = None;
                active.published = true;
            }
            runtime.update_dirty(state);
            metrics::counter!("boluo_server_space_runtime_delta_applied_total").increment(1);
            return Ok(ticket);
        }

        if let Some(active) = state.active_mutation.as_mut() {
            active.base_revision = None;
        }
        let owns_mutation = state
            .active_mutation
            .as_ref()
            .is_some_and(|active| active.mutation_token == mutation_token);
        metrics::counter!(
            "boluo_server_space_runtime_delta_fallback_total",
            "reason" => if owns_mutation { "stale_base" } else { "wrong_mutation" }
        )
        .increment(1);
        let ticket = runtime.reserve_generation();
        let result = Self::reload_snapshot(runtime, state, ticket, false).await;
        if result.is_ok()
            && owns_mutation
            && let Some(active) = state.active_mutation.as_mut()
        {
            active.published = true;
            runtime.update_dirty(state);
        }
        result
    }

    async fn reload_snapshot(
        runtime: &Arc<Self>,
        state: &ControlState,
        ticket: u64,
        is_reconciliation: bool,
    ) -> Result<u64, SpaceRuntimeError> {
        let started = Instant::now();
        metrics::counter!("boluo_server_space_runtime_refresh_total").increment(1);
        let mut result = Err(SpaceRuntimeError::Closed);
        for (attempt, delay) in [
            Duration::ZERO,
            Duration::from_millis(10),
            Duration::from_millis(50),
        ]
        .into_iter()
        .enumerate()
        {
            if !delay.is_zero() {
                tokio::time::sleep(delay).await;
            }
            result = Self::load_snapshot(&runtime.db, runtime.space_id, ticket).await;
            if result.is_ok() {
                break;
            }
            tracing::warn!(
                space_id = %runtime.space_id,
                ticket,
                attempt = attempt + 1,
                "Failed to refresh Space runtime snapshot"
            );
        }
        metrics::histogram!("boluo_server_space_runtime_refresh_duration_seconds")
            .record(started.elapsed().as_secs_f64());

        match result {
            Ok(mut snapshot) => {
                metrics::gauge!("boluo_server_space_runtime_snapshot_channels")
                    .set(snapshot.channels.size() as f64);
                metrics::gauge!("boluo_server_space_runtime_snapshot_characters")
                    .set(snapshot.characters.size() as f64);
                metrics::gauge!("boluo_server_space_runtime_snapshot_space_members")
                    .set(snapshot.space_members.size() as f64);
                metrics::gauge!("boluo_server_space_runtime_snapshot_channel_members").set(
                    snapshot
                        .channel_members
                        .values()
                        .map(PersistentMap::size)
                        .sum::<usize>() as f64,
                );
                let current = runtime.snapshot();
                if is_reconciliation && current.revision <= ticket {
                    let mismatch = current.payload_mismatch(&snapshot);
                    if mismatch.any() {
                        metrics::counter!(
                            "boluo_server_space_runtime_reconciliation_mismatch_total"
                        )
                        .increment(1);
                        tracing::warn!(
                            space_id = %runtime.space_id,
                            space_mismatch = mismatch.space,
                            settings_mismatch = mismatch.settings,
                            channels_mismatch = mismatch.channels,
                            characters_mismatch = mismatch.characters,
                            space_members_mismatch = mismatch.space_members,
                            channel_members_mismatch = mismatch.channel_members,
                            "Space runtime reconciliation detected a snapshot mismatch"
                        );
                    }
                }
                let current_activity_us = current.latest_activity_us.clone();
                current_activity_us.fetch_max(
                    snapshot.space.latest_activity.timestamp_micros(),
                    Ordering::Relaxed,
                );
                snapshot.latest_activity_us = current_activity_us;
                if current.revision <= ticket {
                    runtime.snapshot.store(Arc::new(snapshot));
                }
                runtime.update_dirty(state);
                Ok(ticket)
            }
            Err(error) => {
                metrics::counter!("boluo_server_space_runtime_refresh_failed_total").increment(1);
                tracing::error!(
                    %error,
                    space_id = %runtime.space_id,
                    ticket,
                    "Space runtime remains dirty after refresh failure"
                );
                Err(error)
            }
        }
    }

    fn update_dirty(&self, state: &ControlState) {
        let snapshot_revision = self.snapshot().revision;
        let mutation_unpublished = state
            .active_mutation
            .as_ref()
            .is_some_and(|active| !active.published);
        let dirty =
            self.next_ticket.load(Ordering::Acquire) != snapshot_revision || mutation_unpublished;
        let was_dirty = self.dirty.swap(dirty, Ordering::AcqRel);
        if was_dirty && !dirty {
            self.authoritative_notify.notify_waiters();
        }
    }
}

struct RefreshCommand {
    ticket: u64,
    ack: oneshot::Sender<Result<u64, SpaceRuntimeError>>,
    reconciliation_permit: Option<tokio::sync::OwnedSemaphorePermit>,
}

enum ControlCommand {
    BeginMutation {
        queued_at: Instant,
        granted: oneshot::Sender<u64>,
    },
    FinishMutation {
        mutation_token: u64,
    },
    ApplyCommitted {
        mutation_token: u64,
        deltas: Vec<SpaceDelta>,
        ack: oneshot::Sender<Result<u64, SpaceRuntimeError>>,
    },
    Refresh(RefreshCommand),
}

struct PendingMutation {
    queued_at: Instant,
    granted: oneshot::Sender<u64>,
}

struct ActiveMutation {
    mutation_token: u64,
    base_revision: Option<u64>,
    reserved_ticket: u64,
    published: bool,
    started_at: Instant,
}

#[derive(Default)]
struct ControlState {
    next_mutation_token: u64,
    active_mutation: Option<ActiveMutation>,
    pending_mutations: VecDeque<PendingMutation>,
}

pub(crate) struct SpaceMutationGuard {
    runtime: Weak<SpaceRuntime>,
    space_id: Uuid,
    mutation_token: u64,
}

#[derive(Clone, Copy)]
pub(crate) struct SpaceMutationProof {
    space_id: Uuid,
    mutation_token: u64,
}

impl SpaceMutationGuard {
    pub(crate) fn proof(&self) -> SpaceMutationProof {
        SpaceMutationProof {
            space_id: self.space_id,
            mutation_token: self.mutation_token,
        }
    }
}

impl Drop for SpaceMutationGuard {
    fn drop(&mut self) {
        if let Some(runtime) = self.runtime.upgrade() {
            runtime.finish_mutation(self.mutation_token);
        }
    }
}

#[derive(Clone)]
pub(crate) struct SpaceStore {
    inner: Arc<SpaceStoreInner>,
}

struct SpaceStoreInner {
    db: sqlx::PgPool,
    runtimes: papaya::HashMap<Uuid, Arc<SpaceRuntimeSlot>, ahash::RandomState>,
    reconciliation_permits: Arc<tokio::sync::Semaphore>,
    reconciliation_cursor: AtomicU64,
    #[cfg(test)]
    load_count: std::sync::atomic::AtomicUsize,
}

struct SpaceRuntimeSlot {
    runtime: tokio::sync::OnceCell<Arc<SpaceRuntime>>,
    state: std::sync::Mutex<SpaceRuntimeSlotState>,
}

struct SpaceRuntimeSlotState {
    last_touched: Instant,
    leases: u64,
    evicting: bool,
}

struct SpaceRuntimeSlotLease {
    slot: Arc<SpaceRuntimeSlot>,
}

impl SpaceRuntimeSlot {
    fn new() -> Self {
        Self {
            runtime: tokio::sync::OnceCell::new(),
            state: std::sync::Mutex::new(SpaceRuntimeSlotState {
                last_touched: Instant::now(),
                leases: 0,
                evicting: false,
            }),
        }
    }

    fn acquire(slot: &Arc<Self>) -> Option<SpaceRuntimeSlotLease> {
        let mut state = slot
            .state
            .lock()
            .expect("Space runtime slot state mutex poisoned");
        if state.evicting {
            return None;
        }
        state.last_touched = Instant::now();
        state.leases += 1;
        drop(state);
        Some(SpaceRuntimeSlotLease { slot: slot.clone() })
    }

    fn is_idle(&self, max_idle: Duration) -> bool {
        self.state
            .lock()
            .expect("Space runtime slot state mutex poisoned")
            .last_touched
            .elapsed()
            >= max_idle
    }

    fn mark_evicting_if_idle(&self, max_idle: Duration) -> bool {
        let mut state = self
            .state
            .lock()
            .expect("Space runtime slot state mutex poisoned");
        if state.evicting || state.leases != 0 || state.last_touched.elapsed() < max_idle {
            return false;
        }
        if self.runtime.get().is_some_and(|runtime| {
            runtime.active_mutations.load(Ordering::Acquire) != 0 || Arc::strong_count(runtime) != 1
        }) {
            return false;
        }
        state.evicting = true;
        true
    }

    fn mark_removed(&self) {
        self.state
            .lock()
            .expect("Space runtime slot state mutex poisoned")
            .evicting = true;
    }

    fn touch_runtime_if_active(&self) -> Option<Arc<SpaceRuntime>> {
        let mut state = self
            .state
            .lock()
            .expect("Space runtime slot state mutex poisoned");
        if state.evicting {
            return None;
        }
        state.last_touched = Instant::now();
        self.runtime.get().cloned()
    }

    fn runtime_if_active(&self) -> Option<Arc<SpaceRuntime>> {
        let state = self
            .state
            .lock()
            .expect("Space runtime slot state mutex poisoned");
        if state.evicting {
            return None;
        }
        self.runtime.get().cloned()
    }
}

impl Drop for SpaceRuntimeSlotLease {
    fn drop(&mut self) {
        let mut state = self
            .slot
            .state
            .lock()
            .expect("Space runtime slot state mutex poisoned");
        state.leases = state
            .leases
            .checked_sub(1)
            .expect("Space runtime slot lease count underflow");
    }
}

impl SpaceStore {
    pub(crate) fn new(db: sqlx::PgPool) -> Self {
        let store = Self {
            inner: Arc::new(SpaceStoreInner {
                db,
                runtimes: papaya::HashMap::builder()
                    .capacity(256)
                    .hasher(ahash::RandomState::new())
                    .resize_mode(papaya::ResizeMode::Blocking)
                    .build(),
                reconciliation_permits: Arc::new(tokio::sync::Semaphore::new(
                    MAX_CONCURRENT_RECONCILIATIONS,
                )),
                reconciliation_cursor: AtomicU64::new(0),
                #[cfg(test)]
                load_count: std::sync::atomic::AtomicUsize::new(0),
            }),
        };
        let weak = Arc::downgrade(&store.inner);
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(MAINTENANCE_INTERVAL);
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            interval.tick().await;
            loop {
                interval.tick().await;
                let Some(inner) = weak.upgrade() else {
                    break;
                };
                let store = SpaceStore { inner };
                store.evict_idle(RUNTIME_MAX_IDLE);
                store.reconcile_stale(SNAPSHOT_MAX_AGE);
            }
        });
        store
    }

    pub(crate) fn get(&self, space_id: &Uuid) -> Option<Arc<SpaceRuntime>> {
        let slot = self.inner.runtimes.pin().get(space_id).cloned()?;
        // Cloning the Runtime while holding the slot lock prevents idle eviction
        // after the lock is released, without a separate short-lived slot lease.
        slot.touch_runtime_if_active()
    }

    #[cfg(test)]
    async fn get_with_hook<F>(
        &self,
        space_id: &Uuid,
        after_slot_acquire: F,
    ) -> Option<Arc<SpaceRuntime>>
    where
        F: Future<Output = ()>,
    {
        let slot = self.inner.runtimes.pin().get(space_id).cloned()?;
        let _lease = SpaceRuntimeSlot::acquire(&slot)?;
        after_slot_acquire.await;
        slot.runtime_if_active()
    }

    pub(crate) async fn get_or_load(
        &self,
        space_id: Uuid,
    ) -> Result<Arc<SpaceRuntime>, SpaceRuntimeError> {
        self.get_or_load_with_hook(space_id, std::future::ready(()))
            .await
    }

    pub(crate) async fn authoritative_snapshot(
        &self,
        space_id: Uuid,
    ) -> Result<Option<Arc<SpaceSnapshot>>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        Ok(runtime.authoritative_snapshot_after_wait().await)
    }

    /// Returns an authoritative snapshot only when the Space runtime is already loaded.
    pub(crate) fn loaded_authoritative_snapshot(
        &self,
        space_id: Uuid,
    ) -> Option<Arc<SpaceSnapshot>> {
        self.get(&space_id)
            .and_then(|runtime| runtime.authoritative_snapshot())
    }

    /// Briefly waits for an already-loaded dirty runtime to become authoritative.
    pub(crate) async fn loaded_authoritative_snapshot_after_wait(
        &self,
        space_id: Uuid,
    ) -> Option<Arc<SpaceSnapshot>> {
        let runtime = self.get(&space_id)?;
        runtime.authoritative_snapshot_after_wait().await
    }

    async fn loaded_authoritative_snapshot_once(
        &self,
        space_id: Uuid,
        waited_space_id: &mut Option<Uuid>,
    ) -> Option<Arc<SpaceSnapshot>> {
        if *waited_space_id == Some(space_id) {
            return self.loaded_authoritative_snapshot(space_id);
        }
        *waited_space_id = Some(space_id);
        self.loaded_authoritative_snapshot_after_wait(space_id)
            .await
    }

    /// Returns the current snapshot even while a refresh or mutation makes it non-authoritative.
    ///
    /// Display reads may briefly extend access to previously visible data.
    /// Do not use this to authorize writes or access to newer protected data.
    pub(crate) fn loaded_snapshot_maybe_stale(&self, space_id: Uuid) -> Option<Arc<SpaceSnapshot>> {
        self.get(&space_id).map(|runtime| runtime.snapshot())
    }

    /// Updates weakly consistent activity metadata without loading a cold runtime.
    pub(crate) fn record_latest_activity_if_loaded(
        &self,
        space_id: Uuid,
        update_time: DateTime<Utc>,
    ) {
        if let Some(runtime) = self.get(&space_id) {
            runtime.record_latest_activity(update_time);
        }
    }

    /// Resolves a channel from an optional Space hint.
    ///
    /// Older clients do not send the hint, so the immutable channel ownership cache
    /// discovers the Space (with a small database fallback on a cold entry). If that
    /// Space already has an authoritative runtime snapshot, subsequent reads can use it.
    pub(crate) async fn resolve_channel(
        &self,
        channel_id: Uuid,
        space_id_hint: Option<Uuid>,
    ) -> Result<Option<ResolvedChannel>, sqlx::Error> {
        let mut waited_space_id = None;
        if let Some(space_id) = space_id_hint
            && let Some(snapshot) = self
                .loaded_authoritative_snapshot_once(space_id, &mut waited_space_id)
                .await
            && let Some(channel) = snapshot.channels.get(&channel_id).cloned()
        {
            return Ok(Some(ResolvedChannel {
                channel,
                snapshot: Some(snapshot),
            }));
        }

        if space_id_hint.is_none() {
            let Some(space_id) =
                Channel::resolve_owning_space_id(&self.inner.db, &channel_id).await?
            else {
                return Ok(None);
            };
            if let Some(snapshot) = self
                .loaded_authoritative_snapshot_once(space_id, &mut waited_space_id)
                .await
                && let Some(channel) = snapshot.channels.get(&channel_id).cloned()
            {
                return Ok(Some(ResolvedChannel {
                    channel,
                    snapshot: Some(snapshot),
                }));
            }
        }

        let Some(channel) = Channel::get_by_id(&self.inner.db, &channel_id).await? else {
            return Ok(None);
        };
        if let Some(snapshot) = self
            .loaded_authoritative_snapshot_once(channel.space_id, &mut waited_space_id)
            .await
            && let Some(channel) = snapshot.channels.get(&channel_id).cloned()
        {
            return Ok(Some(ResolvedChannel {
                channel,
                snapshot: Some(snapshot),
            }));
        }
        Ok(Some(ResolvedChannel {
            channel,
            snapshot: None,
        }))
    }

    pub(crate) async fn resolve_character(
        &self,
        space_id: Uuid,
        character_id: Uuid,
    ) -> Result<Option<Character>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        if let Some(snapshot) = runtime.authoritative_snapshot_after_wait().await {
            metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit")
                .increment(1);
            return Ok(snapshot.characters.get(&character_id).cloned());
        }

        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        Character::get_by_id_in_space(&self.inner.db, space_id, &character_id)
            .await
            .map_err(Into::into)
    }

    pub(crate) async fn resolve_channel_member(
        &self,
        space_id: Uuid,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Member>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        if let Some(snapshot) = runtime.authoritative_snapshot_after_wait().await {
            metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit")
                .increment(1);
            return Ok(snapshot.channel_member(channel_id, user_id));
        }

        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        let record = sqlx::query_file!(
            "sql/channels/get_with_space_member.sql",
            user_id,
            channel_id
        )
        .fetch_optional(&self.inner.db)
        .await?;
        Ok(record.and_then(|record| {
            (record.space.space_id == space_id).then_some(Member {
                channel: record.channel,
                space: record.space,
            })
        }))
    }

    async fn get_or_load_with_hook<F>(
        &self,
        space_id: Uuid,
        after_miss: F,
    ) -> Result<Arc<SpaceRuntime>, SpaceRuntimeError>
    where
        F: Future<Output = ()>,
    {
        if let Some(runtime) = self.get(&space_id) {
            return Ok(runtime);
        }
        let (slot, _lease) = loop {
            let slot = self
                .inner
                .runtimes
                .pin()
                .get_or_insert_with(space_id, || Arc::new(SpaceRuntimeSlot::new()))
                .clone();
            if let Some(lease) = SpaceRuntimeSlot::acquire(&slot) {
                break (slot, lease);
            }
            tokio::task::yield_now().await;
        };
        after_miss.await;
        slot.runtime
            .get_or_try_init(|| async {
                #[cfg(test)]
                self.inner
                    .load_count
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                SpaceRuntime::load(&self.inner.db, space_id).await
            })
            .await?;
        slot.runtime_if_active().ok_or(SpaceRuntimeError::NotFound)
    }

    /// Refreshes an existing runtime without loading a cold Space as a write side effect.
    pub(crate) async fn refresh_if_loaded(
        &self,
        space_id: Uuid,
    ) -> Result<Option<u64>, SpaceRuntimeError> {
        let Some(runtime) = self.get(&space_id) else {
            return Ok(None);
        };
        runtime.refresh_committed().await.map(Some)
    }

    pub(crate) async fn apply_deltas_if_loaded(
        &self,
        space_id: Uuid,
        deltas: Vec<SpaceDelta>,
        mutation: Option<SpaceMutationProof>,
    ) -> Result<Option<u64>, SpaceRuntimeError> {
        let Some(runtime) = self.get(&space_id) else {
            return Ok(None);
        };
        let Some(mutation_token) = mutation
            .filter(|mutation| mutation.space_id == space_id)
            .map(|mutation| mutation.mutation_token)
        else {
            metrics::counter!(
                "boluo_server_space_runtime_delta_fallback_total",
                "reason" => "unguarded"
            )
            .increment(1);
            return runtime.refresh_committed().await.map(Some);
        };
        runtime
            .apply_committed_deltas(mutation_token, deltas)
            .await
            .map(Some)
    }

    pub(crate) async fn acquire_mutation(
        &self,
        space_id: Uuid,
    ) -> Result<SpaceMutationGuard, SpaceRuntimeError> {
        self.get_or_load(space_id).await?.acquire_mutation().await
    }

    pub(crate) fn remove(&self, space_id: Uuid) {
        let _ = self.inner.runtimes.pin().remove_if(&space_id, |_, slot| {
            slot.mark_removed();
            true
        });
    }

    fn evict_idle(&self, max_idle: Duration) -> usize {
        let candidates: Vec<_> = self
            .inner
            .runtimes
            .pin()
            .iter()
            .filter(|(_, slot)| slot.is_idle(max_idle))
            .map(|(space_id, slot)| (*space_id, slot.clone()))
            .collect();
        let mut evicted = 0;
        for (space_id, expected_slot) in candidates {
            let pinned = self.inner.runtimes.pin();
            let result = pinned.remove_if(&space_id, |_, current_slot| {
                if !Arc::ptr_eq(current_slot, &expected_slot) {
                    return false;
                }
                current_slot.mark_evicting_if_idle(max_idle)
            });
            if matches!(result, Ok(Some(_))) {
                evicted += 1;
                metrics::counter!("boluo_server_space_runtime_evicted_total").increment(1);
            }
        }
        evicted
    }

    fn reconcile_stale(&self, max_age: Duration) -> usize {
        let mut runtimes: Vec<_> = self
            .inner
            .runtimes
            .pin()
            .iter()
            .filter_map(|(_, slot)| slot.runtime_if_active())
            .filter(|runtime| runtime.needs_reconciliation(max_age))
            .collect();
        if runtimes.is_empty() {
            return 0;
        }
        let max_connections = self.inner.db.options().get_max_connections() as usize;
        let checked_out = (self.inner.db.size() as usize).saturating_sub(self.inner.db.num_idle());
        let available_capacity = max_connections.saturating_sub(checked_out);
        let foreground_reserve = max_connections.div_ceil(8).clamp(1, 4);
        let pool_budget = available_capacity.saturating_sub(foreground_reserve);
        if pool_budget == 0 {
            metrics::counter!(
                "boluo_server_space_runtime_reconciliation_skipped_total",
                "reason" => "database_pool_pressure"
            )
            .increment(1);
            return 0;
        }
        let budget = pool_budget.min(self.inner.reconciliation_permits.available_permits());
        if budget == 0 {
            return 0;
        }
        let start = self
            .inner
            .reconciliation_cursor
            .fetch_add(budget as u64, Ordering::Relaxed) as usize
            % runtimes.len();
        runtimes.rotate_left(start);
        let mut scheduled = 0;
        for runtime in runtimes {
            if runtime.reconcile_if_stale(max_age, &self.inner.reconciliation_permits) {
                scheduled += 1;
                if scheduled == budget {
                    break;
                }
            }
        }
        scheduled
    }

    #[cfg(test)]
    fn load_count(&self) -> usize {
        self.inner
            .load_count
            .load(std::sync::atomic::Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::channels::ChannelType;
    use crate::characters::CharacterVisibility;
    use crate::committed_changes::CommittedChanges;
    use crate::context::AppContext;
    use crate::users::User;

    async fn create_space(pool: &sqlx::PgPool) -> (User, Space, Channel) {
        let suffix = Uuid::new_v4().simple().to_string();
        let owner = User::register(
            pool,
            &format!("runtime_{}@example.com", &suffix[..8]),
            &format!("runtime_owner_{}", &suffix[..8]),
            "Runtime Owner",
            "RuntimePass123!",
        )
        .await
        .expect("failed to create owner");
        let space = Space::create(
            pool,
            format!("runtime_space_{}", &suffix[..8]),
            &owner.id,
            String::new(),
            None,
            Some("d20"),
        )
        .await
        .expect("failed to create space");
        SpaceMember::add_admin(pool, &owner.id, &space.id)
            .await
            .expect("failed to add owner to space");
        let channel = Channel::create(
            pool,
            &space.id,
            "Runtime Channel",
            false,
            Some("d20"),
            ChannelType::InGame,
        )
        .await
        .expect("failed to create channel");
        ChannelMember::add_user(pool, owner.id, channel.id, "GM", true)
            .await
            .expect("failed to add owner to channel");
        (owner, space, channel)
    }

    #[sqlx::test]
    async fn db_test_space_store_coalesces_concurrent_loads(pool: sqlx::PgPool) {
        let (owner, space, channel) = create_space(&pool).await;

        let store = SpaceStore::new(pool);
        let barrier = Arc::new(tokio::sync::Barrier::new(2));
        let first = {
            let store = store.clone();
            let barrier = barrier.clone();
            tokio::spawn(async move {
                store
                    .get_or_load_with_hook(space.id, async move {
                        barrier.wait().await;
                    })
                    .await
            })
        };
        let second = {
            let store = store.clone();
            let barrier = barrier.clone();
            tokio::spawn(async move {
                store
                    .get_or_load_with_hook(space.id, async move {
                        barrier.wait().await;
                    })
                    .await
            })
        };

        let first = first.await.expect("first load task failed").unwrap();
        let second = second.await.expect("second load task failed").unwrap();

        assert!(Arc::ptr_eq(&first, &second));
        assert_eq!(
            store.load_count(),
            1,
            "concurrent callers loaded the same Space snapshot more than once"
        );
        let snapshot = first.snapshot();
        assert_eq!(snapshot.space().id, space.id);
        assert!(snapshot.channels.contains_key(&channel.id));
        assert!(snapshot.space_members.contains_key(&owner.id));
        assert_eq!(
            snapshot.channel_members[&channel.id][&owner.id].character_name,
            "GM"
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_member_reads_use_runtime_without_creating_mailbox(pool: sqlx::PgPool) {
        let (owner, space, channel) = create_space(&pool).await;
        let ctx = AppContext::new(pool.clone(), None);

        let member = ctx
            .space_store
            .resolve_channel_member(space.id, channel.id, owner.id)
            .await
            .expect("failed to resolve channel member")
            .expect("owner is missing from channel");
        assert!(member.channel.is_master);
        assert!(
            crate::events::context::store()
                .get_manager(&space.id)
                .is_none(),
            "a structural member read created mailbox state"
        );

        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire Space mutation");
        ChannelMember::remove_user(&pool, owner.id, channel.id)
            .await
            .expect("failed to remove channel member");
        assert!(
            ctx.space_store
                .resolve_channel_member(space.id, channel.id, owner.id)
                .await
                .expect("failed to use database fallback while runtime was dirty")
                .is_none(),
            "dirty runtime returned its stale member snapshot"
        );

        let mut changes = CommittedChanges::default();
        changes.channel_member_removed(space.id, channel.id, owner.id);
        changes.apply_with_mutation(&ctx, &mutation).await;
        assert!(
            ctx.space_store
                .resolve_channel_member(space.id, channel.id, owner.id)
                .await
                .expect("failed to read refreshed runtime")
                .is_none(),
            "refreshed runtime retained a removed member"
        );
        assert!(
            crate::events::context::store()
                .get_manager(&space.id)
                .is_none(),
            "member refresh created mailbox state"
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_snapshot_tracks_settings_and_only_joined_channel_members(pool: sqlx::PgPool) {
        let (_owner, space, channel) = create_space(&pool).await;
        let suffix = Uuid::new_v4().simple().to_string();
        let former_member = User::register(
            &pool,
            &format!("former_{}@example.com", &suffix[..8]),
            &format!("former_{}", &suffix[..8]),
            "Former Member",
            "FormerPass123!",
        )
        .await
        .expect("failed to create former member");
        SpaceMember::add_user(&pool, &former_member.id, &space.id)
            .await
            .expect("failed to add former Space member");
        ChannelMember::add_user(&pool, former_member.id, channel.id, "Former", false)
            .await
            .expect("failed to add former Channel member");
        ChannelMember::remove_user(&pool, former_member.id, channel.id)
            .await
            .expect("failed to remove former Channel member");
        Space::put_settings(&pool, space.id, &serde_json::json!({"theme": "dark"}))
            .await
            .expect("failed to write Space settings");

        let ctx = AppContext::new(pool.clone(), None);
        let runtime = ctx
            .space_store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");
        let snapshot = runtime
            .authoritative_snapshot()
            .expect("runtime snapshot is dirty");
        assert_eq!(snapshot.settings, serde_json::json!({"theme": "dark"}));
        assert!(
            snapshot
                .channel_members
                .get(&channel.id)
                .is_none_or(|members| !members.contains_key(&former_member.id)),
            "a former member was treated as currently joined"
        );
        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire settings mutation");
        Space::put_settings(&pool, space.id, &serde_json::json!({"theme": "light"}))
            .await
            .expect("failed to update Space settings");
        let mut changes = CommittedChanges::default();
        changes.space_settings_updated(space.id, serde_json::json!({"theme": "light"}));
        changes.apply_with_mutation(&ctx, &mutation).await;
        assert_eq!(
            runtime
                .authoritative_snapshot()
                .expect("refreshed runtime snapshot is dirty")
                .settings,
            serde_json::json!({"theme": "light"})
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_reconciliation_detects_mismatch_and_respects_pool_pressure(
        pool: sqlx::PgPool,
    ) {
        let (_owner, space, _) = create_space(&pool).await;
        Space::put_settings(&pool, space.id, &serde_json::json!({"version": "cached"}))
            .await
            .expect("failed to write initial settings");
        let store = SpaceStore::new(pool.clone());
        let runtime = store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");

        Space::put_settings(&pool, space.id, &serde_json::json!({"version": "database"}))
            .await
            .expect("failed to write out-of-band settings");
        assert_eq!(
            runtime
                .authoritative_snapshot()
                .expect("fresh runtime was unexpectedly dirty")
                .settings,
            serde_json::json!({"version": "cached"}),
            "the test write unexpectedly updated process-local state"
        );
        let reloaded = SpaceRuntime::load_snapshot(&pool, space.id, 0)
            .await
            .expect("failed to reload Space snapshot");
        assert_eq!(
            runtime.snapshot().payload_mismatch(&reloaded),
            SnapshotPayloadMismatch {
                settings: true,
                ..SnapshotPayloadMismatch::default()
            }
        );

        let max_connections = pool.options().get_max_connections() as usize;
        assert!(max_connections > 1);
        let mut held_connections = Vec::new();
        for _ in 0..max_connections - 1 {
            held_connections.push(
                pool.acquire()
                    .await
                    .expect("failed to create database pool pressure"),
            );
        }
        assert_eq!(
            store.reconcile_stale(Duration::ZERO),
            0,
            "reconciliation consumed the foreground connection reserve"
        );
        drop(held_connections);
        tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                let checked_out = (pool.size() as usize).saturating_sub(pool.num_idle());
                if checked_out == 0 {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("database pool pressure did not clear");

        store.reconcile_stale(Duration::ZERO);

        tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                if let Some(snapshot) = runtime.authoritative_snapshot()
                    && snapshot.settings == serde_json::json!({"version": "database"})
                {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("background reconciliation did not publish the database state");
    }

    #[sqlx::test]
    async fn db_test_committed_changes_update_only_loaded_runtimes(pool: sqlx::PgPool) {
        let (_, loaded_space, initial_channel) = create_space(&pool).await;
        let (_, cold_space, _) = create_space(&pool).await;
        let ctx = AppContext::new(pool.clone(), None);
        let runtime = ctx
            .space_store
            .get_or_load(loaded_space.id)
            .await
            .expect("failed to load runtime");

        let first = Channel::create(
            &pool,
            &loaded_space.id,
            "First committed",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to create first channel");
        let second = Channel::create(
            &pool,
            &loaded_space.id,
            "Second committed",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to create second channel");

        // Apply in the reverse order of the database commits. Each refresh must load current
        // committed state instead of publishing the object carried by the older change set.
        let mut second_changes = CommittedChanges::default();
        second_changes.channel_created(&second);
        second_changes.apply_with_context(&ctx).await;
        let mut first_changes = CommittedChanges::default();
        first_changes.channel_created(&first);
        first_changes.apply_with_context(&ctx).await;

        let snapshot = runtime
            .authoritative_snapshot()
            .expect("runtime remained dirty");
        assert!(snapshot.channels.contains_key(&initial_channel.id));
        assert!(snapshot.channels.contains_key(&first.id));
        assert!(snapshot.channels.contains_key(&second.id));

        let cold_channel = Channel::create(
            &pool,
            &cold_space.id,
            "Cold runtime",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to create channel");
        let mut changes = CommittedChanges::default();
        changes.channel_created(&cold_channel);
        changes.apply_with_context(&ctx).await;

        assert!(
            ctx.space_store.get(&cold_space.id).is_none(),
            "a committed write unexpectedly loaded a cold runtime"
        );
    }

    #[sqlx::test]
    async fn db_test_character_changes_refresh_loaded_runtime(pool: sqlx::PgPool) {
        let (owner, space, _) = create_space(&pool).await;
        let ctx = AppContext::new(pool.clone(), None);
        let runtime = ctx
            .space_store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");
        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire Character creation mutation");
        let character = Character::create(
            &pool,
            space.id,
            owner.id,
            "Runtime Character",
            "",
            "",
            None,
            None,
            CharacterVisibility::Private,
            false,
            serde_json::json!({}),
        )
        .await
        .expect("failed to create Character");
        let mut changes = CommittedChanges::default();
        changes.character_updated(&character);
        changes.apply_with_mutation(&ctx, &mutation).await;
        drop(mutation);
        assert_eq!(
            runtime
                .authoritative_snapshot()
                .expect("runtime remained dirty after Character creation")
                .characters[&character.id]
                .name,
            "Runtime Character"
        );
        assert!(
            ctx.space_store
                .resolve_character(space.id, character.id)
                .await
                .expect("failed to resolve Character")
                .is_some()
        );

        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire Character deletion mutation");
        Character::delete(&pool, &character.id)
            .await
            .expect("failed to delete Character");
        let mut changes = CommittedChanges::default();
        changes.character_deleted(space.id, character.id);
        changes.apply_with_mutation(&ctx, &mutation).await;
        assert!(
            !runtime
                .authoritative_snapshot()
                .expect("runtime remained dirty after Character deletion")
                .characters
                .contains_key(&character.id)
        );
    }

    #[sqlx::test]
    async fn db_test_space_mutations_are_serialized_and_guard_eviction(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool);
        let first = store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire first mutation");
        assert_eq!(
            store.evict_idle(Duration::ZERO),
            0,
            "an active mutation runtime was evicted"
        );

        let (attempted_tx, attempted_rx) = oneshot::channel();
        let (acquired_tx, mut acquired_rx) = oneshot::channel();
        let second = {
            let store = store.clone();
            tokio::spawn(async move {
                let _ = attempted_tx.send(());
                let guard = store
                    .acquire_mutation(space.id)
                    .await
                    .expect("failed to acquire second mutation");
                let _ = acquired_tx.send(());
                guard
            })
        };
        attempted_rx.await.expect("second mutation did not start");
        tokio::task::yield_now().await;
        assert!(
            matches!(
                acquired_rx.try_recv(),
                Err(oneshot::error::TryRecvError::Empty)
            ),
            "a second mutation entered the same Space concurrently"
        );

        drop(first);
        acquired_rx.await.expect("second mutation was not released");
        let second = second.await.expect("second mutation task failed");
        drop(second);
        store
            .refresh_if_loaded(space.id)
            .await
            .expect("failed to await guard refresh");
        tokio::task::yield_now().await;
        assert_eq!(store.evict_idle(Duration::ZERO), 1);
        assert!(store.get(&space.id).is_none());
    }

    #[sqlx::test]
    async fn db_test_hot_runtime_get_guards_idle_eviction(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool);
        drop(
            store
                .get_or_load(space.id)
                .await
                .expect("failed to load Space runtime"),
        );

        let runtime = store
            .get(&space.id)
            .expect("hot get did not return the loaded Runtime");
        assert_eq!(
            store.evict_idle(Duration::ZERO),
            0,
            "idle eviction removed a Runtime held by a hot get"
        );

        drop(runtime);
        assert_eq!(store.evict_idle(Duration::ZERO), 1);
    }

    #[sqlx::test]
    async fn db_test_idle_eviction_does_not_race_runtime_get(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool);
        drop(
            store
                .get_or_load(space.id)
                .await
                .expect("failed to load Space runtime"),
        );

        let (slot_cloned_tx, slot_cloned_rx) = oneshot::channel();
        let (resume_get_tx, resume_get_rx) = oneshot::channel();
        let get_task = {
            let store = store.clone();
            tokio::spawn(async move {
                store
                    .get_with_hook(&space.id, async move {
                        slot_cloned_tx
                            .send(())
                            .expect("slot clone receiver was dropped");
                        resume_get_rx.await.expect("get resume sender was dropped");
                    })
                    .await
            })
        };
        slot_cloned_rx
            .await
            .expect("get did not clone the runtime slot");

        let evicted = store.evict_idle(Duration::ZERO);
        resume_get_tx.send(()).expect("paused get task was dropped");
        let fetched = get_task.await.expect("get task panicked");

        assert_eq!(
            evicted, 0,
            "idle eviction removed a slot while get was acquiring its Runtime"
        );
        assert!(fetched.is_some(), "the paused get lost its Runtime");
        assert!(
            store.get(&space.id).is_some(),
            "the fetched Runtime was no longer registered in the Store"
        );
    }

    #[sqlx::test]
    async fn db_test_removed_slot_is_not_returned_by_in_flight_get(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool);
        drop(
            store
                .get_or_load(space.id)
                .await
                .expect("failed to load Space runtime"),
        );

        let (slot_acquired_tx, slot_acquired_rx) = oneshot::channel();
        let (resume_get_tx, resume_get_rx) = oneshot::channel();
        let get_task = {
            let store = store.clone();
            tokio::spawn(async move {
                store
                    .get_with_hook(&space.id, async move {
                        slot_acquired_tx
                            .send(())
                            .expect("slot acquire receiver was dropped");
                        resume_get_rx.await.expect("get resume sender was dropped");
                    })
                    .await
            })
        };
        slot_acquired_rx
            .await
            .expect("get did not acquire the runtime slot");

        store.remove(space.id);
        resume_get_tx.send(()).expect("paused get task was dropped");
        let fetched = get_task.await.expect("get task panicked");

        assert!(
            fetched.is_none(),
            "an in-flight get returned a Runtime after its slot was removed"
        );
        assert!(store.get(&space.id).is_none());
    }

    #[sqlx::test]
    async fn db_test_different_space_mutations_do_not_block_each_other(pool: sqlx::PgPool) {
        let (_, first_space, _) = create_space(&pool).await;
        let (_, second_space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool);
        let first = store
            .acquire_mutation(first_space.id)
            .await
            .expect("failed to acquire first Space");
        let second = store
            .acquire_mutation(second_space.id)
            .await
            .expect("a different Space was blocked by the first");
        drop((first, second));
    }

    #[sqlx::test]
    async fn db_test_mutation_blocks_strict_reads_until_snapshot_is_published(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool);
        let runtime = store
            .get_or_load(space.id)
            .await
            .expect("failed to load runtime");
        assert!(
            runtime.authoritative_snapshot().is_some(),
            "freshly loaded snapshot was not authoritative"
        );

        let mutation = runtime
            .acquire_mutation()
            .await
            .expect("failed to acquire mutation");
        assert!(
            runtime.authoritative_snapshot().is_none(),
            "snapshot remained authoritative while a mutation was active"
        );
        assert!(
            store.loaded_snapshot_maybe_stale(space.id).is_some(),
            "a stale-tolerant read could not use the loaded snapshot"
        );

        let waiting_read = {
            let runtime = runtime.clone();
            tokio::spawn(async move {
                runtime
                    .authoritative_snapshot_after(Duration::from_secs(1))
                    .await
            })
        };
        tokio::task::yield_now().await;

        runtime
            .apply_committed_deltas(
                mutation.proof().mutation_token,
                vec![SpaceDelta::SettingsUpdated(
                    serde_json::json!({"version": "published"}),
                )],
            )
            .await
            .expect("failed to publish mutation delta");
        let snapshot = waiting_read
            .await
            .expect("strict read task failed")
            .expect("strict read did not recover after snapshot publication");
        assert_eq!(
            snapshot.settings,
            serde_json::json!({"version": "published"})
        );
        drop(mutation);
    }

    #[sqlx::test]
    async fn db_test_full_mutation_queue_rejects_before_operation(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool);
        let runtime = store
            .get_or_load(space.id)
            .await
            .expect("failed to load runtime");
        let first = runtime
            .acquire_mutation()
            .await
            .expect("failed to occupy mutation actor");
        let mut queued = Vec::new();
        for _ in 0..MAX_QUEUED_MUTATIONS {
            let runtime = runtime.clone();
            queued.push(tokio::spawn(
                async move { runtime.acquire_mutation().await },
            ));
        }
        tokio::time::timeout(Duration::from_secs(1), async {
            while runtime.active_mutations.load(Ordering::Acquire) != MAX_QUEUED_MUTATIONS + 1 {
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("mutation queue did not fill");

        assert!(matches!(
            runtime.acquire_mutation().await,
            Err(SpaceRuntimeError::Busy)
        ));
        drop(first);
        for task in queued {
            task.await
                .expect("queued mutation task panicked")
                .expect("queued mutation was rejected");
        }
    }

    #[sqlx::test]
    async fn db_test_dropped_mutation_guard_repairs_committed_state(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool.clone());
        let runtime = store
            .get_or_load(space.id)
            .await
            .expect("failed to load runtime");
        let guard = store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire mutation");
        let channel = Channel::create(
            &pool,
            &space.id,
            "Committed before cancellation",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to commit channel");

        // Simulate cancellation after commit but before CommittedChanges::apply.
        drop(guard);
        assert!(
            runtime.authoritative_snapshot().is_none(),
            "the pre-commit snapshot stayed authoritative after a cancelled mutation"
        );
        tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                if let Some(snapshot) = runtime.authoritative_snapshot()
                    && snapshot.channels.contains_key(&channel.id)
                {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("detached mutation refresh did not finish");
    }

    #[sqlx::test]
    async fn db_test_unguarded_change_cannot_publish_another_mutation(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let ctx = AppContext::new(pool.clone(), None);
        let runtime = ctx
            .space_store
            .get_or_load(space.id)
            .await
            .expect("failed to load runtime");
        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire mutation");

        let unguarded_channel = Channel::create(
            &pool,
            &space.id,
            "Unguarded concurrent change",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to commit unguarded channel");
        let mut unguarded_changes = CommittedChanges::default();
        unguarded_changes.channel_created(&unguarded_channel);
        unguarded_changes.apply_with_context(&ctx).await;

        let cancelled_channel = Channel::create(
            &pool,
            &space.id,
            "Committed before cancellation",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to commit guarded channel");

        // The unguarded publication must not count as this mutation's publication.
        drop(mutation);
        tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                if let Some(snapshot) = runtime.authoritative_snapshot()
                    && snapshot.channels.contains_key(&unguarded_channel.id)
                    && snapshot.channels.contains_key(&cancelled_channel.id)
                {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("cancelled mutation was hidden by an unrelated publication");
    }
}
