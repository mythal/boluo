use std::collections::{HashMap, VecDeque};
use std::future::Future;
use std::sync::atomic::{AtomicBool, AtomicI64, AtomicU64, Ordering};
use std::sync::{Arc, Weak};
use std::time::{Duration, Instant};

use arc_swap::ArcSwap;
use time::OffsetDateTime;
use tokio::sync::{mpsc, oneshot};
use uuid::Uuid;

use crate::channels::models::Member;
use crate::channels::{Channel, ChannelMember};
use crate::characters::Character;
use crate::entries::models::{Entry, EntryMetadata};
use crate::notes::{Note, NoteMetadata};
use crate::scopes::models::Scope;
use crate::space_payload_cache::SpacePayloadCache;
use crate::spaces::models::SpaceRecord;
use crate::spaces::{Space, SpaceMember};

pub(crate) type SnapshotMap<K, V> = HashMap<K, V, ahash::RandomState>;

#[derive(Debug, Clone, PartialEq)]
struct CoreSnapshot {
    space: SpaceRecord,
    settings: serde_json::Value,
    channels: SnapshotMap<Uuid, Channel>,
}

#[derive(Debug, Clone, PartialEq)]
struct MembersSnapshot {
    space_members: SnapshotMap<Uuid, SpaceMember>,
    channel_members: SnapshotMap<Uuid, Arc<SnapshotMap<Uuid, ChannelMember>>>,
}

#[derive(Debug, Clone, PartialEq)]
struct NotesSnapshot {
    notes: SnapshotMap<Uuid, NoteMetadata>,
}

#[derive(Debug, Clone, PartialEq)]
struct ScopesSnapshot {
    characters: SnapshotMap<Uuid, Character>,
    scopes: SnapshotMap<Uuid, Scope>,
}

#[derive(Debug, Clone, PartialEq)]
struct EntriesSnapshot {
    entries: SnapshotMap<Uuid, Arc<SnapshotMap<Uuid, EntryMetadata>>>,
}

const MAINTENANCE_INTERVAL: Duration = Duration::from_secs(60);
const SNAPSHOT_MAX_AGE: Duration = Duration::from_secs(10 * 60);
const RUNTIME_MAX_IDLE: Duration = Duration::from_secs(30 * 60);
const MAX_CONCURRENT_RECONCILIATIONS: usize = 2;
const MAX_QUEUED_MUTATIONS: u64 = 64;
const AUTHORITATIVE_SNAPSHOT_WAIT: Duration = Duration::from_millis(3);

#[derive(Debug, Clone)]
pub(crate) struct SpaceSnapshot {
    pub(crate) revision: u64,
    database_fingerprint: DatabaseFingerprint,
    latest_activity_us: Arc<AtomicI64>,
    core: Arc<CoreSnapshot>,
    members: Arc<MembersSnapshot>,
    notes: Arc<NotesSnapshot>,
    scopes: Arc<ScopesSnapshot>,
    entries: Arc<EntriesSnapshot>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct ChannelMembership {
    pub(crate) is_master: bool,
}

impl ChannelMembership {
    pub(crate) async fn get<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_file_scalar!(
            "sql/channels/get_membership.sql",
            user_id,
            channel_id,
            space_id,
        )
        .fetch_optional(db)
        .await
        .map(|membership| membership.map(|is_master| Self { is_master }))
    }
}

/// A read-only, probabilistic change detector for one independently reloadable
/// section of a Space snapshot.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
struct SectionFingerprint {
    row_count: i64,
    xor_a: i64,
    xor_b: i64,
}

/// Fingerprints are split along the same boundaries as the snapshot payload so
/// reconciliation can reload only the sections which actually changed.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
struct DatabaseFingerprint {
    core: SectionFingerprint,
    members: SectionFingerprint,
    notes: SectionFingerprint,
    scopes: SectionFingerprint,
    entries: SectionFingerprint,
}

#[derive(Debug, sqlx::FromRow)]
struct DatabaseFingerprintRow {
    section: String,
    row_count: i64,
    xor_a: i64,
    xor_b: i64,
}

enum ReconciliationResult {
    Unchanged,
    Refreshed {
        snapshot: Arc<SpaceSnapshot>,
        changed: SnapshotSections,
    },
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
struct SnapshotSections {
    core: bool,
    members: bool,
    notes: bool,
    scopes: bool,
    entries: bool,
}

impl SnapshotSections {
    fn any(self) -> bool {
        self.core || self.members || self.notes || self.scopes || self.entries
    }

    fn record_refreshes(self) {
        for (section, changed) in [
            ("core", self.core),
            ("members", self.members),
            ("notes", self.notes),
            ("scopes", self.scopes),
            ("entries", self.entries),
        ] {
            if changed {
                metrics::counter!(
                    "boluo_server_space_runtime_reconciliation_section_refresh_total",
                    "section" => section
                )
                .increment(1);
            }
        }
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
struct SnapshotPayloadMismatch {
    space: bool,
    settings: bool,
    channels: bool,
    characters: bool,
    notes: bool,
    scopes: bool,
    entries: bool,
    space_members: bool,
    channel_members: bool,
}

impl SnapshotPayloadMismatch {
    fn any(&self) -> bool {
        self.space
            || self.settings
            || self.channels
            || self.characters
            || self.notes
            || self.scopes
            || self.entries
            || self.space_members
            || self.channel_members
    }

    fn report(self, space_id: Uuid) {
        if !self.any() {
            return;
        }
        metrics::counter!("boluo_server_space_runtime_reconciliation_mismatch_total").increment(1);
        tracing::warn!(
            event = "space_runtime.snapshot.mismatch",
            %space_id,
            space_mismatch = self.space,
            settings_mismatch = self.settings,
            channels_mismatch = self.channels,
            characters_mismatch = self.characters,
            notes_mismatch = self.notes,
            scopes_mismatch = self.scopes,
            entries_mismatch = self.entries,
            space_members_mismatch = self.space_members,
            channel_members_mismatch = self.channel_members,
            "Space runtime reconciliation detected a snapshot mismatch"
        );
    }
}

impl DatabaseFingerprint {
    fn from_rows(rows: Vec<DatabaseFingerprintRow>) -> Self {
        let mut fingerprint = Self::default();
        for row in rows {
            let section = SectionFingerprint {
                row_count: row.row_count,
                xor_a: row.xor_a,
                xor_b: row.xor_b,
            };
            match row.section.as_str() {
                "core" => fingerprint.core = section,
                "members" => fingerprint.members = section,
                "notes" => fingerprint.notes = section,
                "scopes" => fingerprint.scopes = section,
                "entries" => fingerprint.entries = section,
                section => debug_assert!(false, "unknown snapshot fingerprint section: {section}"),
            }
        }
        fingerprint
    }

    fn changed_sections(&self, current: &Self) -> SnapshotSections {
        SnapshotSections {
            core: self.core != current.core,
            members: self.members != current.members,
            notes: self.notes != current.notes,
            scopes: self.scopes != current.scopes,
            entries: self.entries != current.entries,
        }
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
    NoteUpserted(NoteMetadata),
    ScopeUpserted(Scope),
    ScopeDeleted(Uuid),
    EntryUpserted(EntryMetadata),
    EntryDeleted {
        scope_id: Uuid,
        entry_id: Uuid,
    },
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

impl MembersSnapshot {
    fn upsert_channel_member(&mut self, member: ChannelMember) {
        let channel_id = member.channel_id;
        let user_id = member.user_id;
        if member.is_joined {
            Arc::make_mut(
                self.channel_members
                    .entry(channel_id)
                    .or_insert_with(|| Arc::new(SnapshotMap::default())),
            )
            .insert(user_id, member);
        } else {
            self.remove_channel_member(channel_id, user_id);
        }
    }

    fn remove_channel_member(&mut self, channel_id: Uuid, user_id: Uuid) {
        let should_remove_channel =
            self.channel_members
                .get_mut(&channel_id)
                .is_some_and(|members| {
                    let members = Arc::make_mut(members);
                    members.remove(&user_id);
                    members.is_empty()
                });
        if should_remove_channel {
            self.channel_members.remove(&channel_id);
        }
    }
}

impl EntriesSnapshot {
    fn upsert(&mut self, entry: EntryMetadata) {
        Arc::make_mut(
            self.entries
                .entry(entry.scope_id)
                .or_insert_with(|| Arc::new(SnapshotMap::default())),
        )
        .insert(entry.id, entry);
    }

    fn remove(&mut self, scope_id: Uuid, entry_id: Uuid) {
        let should_remove_scope = self.entries.get_mut(&scope_id).is_some_and(|entries| {
            let entries = Arc::make_mut(entries);
            entries.remove(&entry_id);
            entries.is_empty()
        });
        if should_remove_scope {
            self.entries.remove(&scope_id);
        }
    }
}

impl SpaceSnapshot {
    pub(crate) fn space_record(&self) -> &SpaceRecord {
        &self.core.space
    }

    pub(crate) fn settings(&self) -> &serde_json::Value {
        &self.core.settings
    }

    pub(crate) fn channels(&self) -> &SnapshotMap<Uuid, Channel> {
        &self.core.channels
    }

    pub(crate) fn characters(&self) -> &SnapshotMap<Uuid, Character> {
        &self.scopes.characters
    }

    pub(crate) fn notes(&self) -> &SnapshotMap<Uuid, NoteMetadata> {
        &self.notes.notes
    }

    pub(crate) fn scopes(&self) -> &SnapshotMap<Uuid, Scope> {
        &self.scopes.scopes
    }

    pub(crate) fn entries(&self) -> &SnapshotMap<Uuid, Arc<SnapshotMap<Uuid, EntryMetadata>>> {
        &self.entries.entries
    }

    pub(crate) fn space_members(&self) -> &SnapshotMap<Uuid, SpaceMember> {
        &self.members.space_members
    }

    pub(crate) fn channel_members(
        &self,
    ) -> &SnapshotMap<Uuid, Arc<SnapshotMap<Uuid, ChannelMember>>> {
        &self.members.channel_members
    }

    pub(crate) fn space(&self) -> Space {
        let latest_activity = OffsetDateTime::from_unix_timestamp_nanos(
            self.latest_activity_us.load(Ordering::Relaxed) as i128 * 1_000,
        )
        .expect("Space latest_activity must be a valid UTC timestamp");
        Space::from_record(self.core.space.clone(), latest_activity)
    }

    pub(crate) fn channel_member(&self, channel_id: Uuid, user_id: Uuid) -> Option<Member> {
        let channel = self
            .channel_members()
            .get(&channel_id)?
            .get(&user_id)?
            .clone();
        let space = self.space_members().get(&user_id)?.clone();
        Some(Member { channel, space })
    }

    pub(crate) fn channel_membership(
        &self,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Option<ChannelMembership> {
        let channel = self.channel_members().get(&channel_id)?.get(&user_id)?;
        self.space_members()
            .contains_key(&user_id)
            .then_some(ChannelMembership {
                is_master: channel.is_master,
            })
    }

    pub(crate) fn members_in_channel(&self, channel_id: Uuid) -> Vec<Member> {
        self.channel_members()
            .get(&channel_id)
            .into_iter()
            .flat_map(|members| members.values())
            .filter_map(|channel| {
                self.space_members()
                    .get(&channel.user_id)
                    .map(|space| Member {
                        channel: channel.clone(),
                        space: space.clone(),
                    })
            })
            .collect()
    }

    fn payload_mismatch(&self, reloaded: &Self) -> SnapshotPayloadMismatch {
        SnapshotPayloadMismatch {
            space: self.space_record() != reloaded.space_record(),
            settings: self.settings() != reloaded.settings(),
            channels: self.channels() != reloaded.channels(),
            characters: self.characters() != reloaded.characters(),
            notes: self.notes() != reloaded.notes(),
            scopes: self.scopes() != reloaded.scopes(),
            entries: self.entries() != reloaded.entries(),
            space_members: self.space_members() != reloaded.space_members(),
            channel_members: self.channel_members() != reloaded.channel_members(),
        }
    }

    fn apply_deltas(&self, revision: u64, deltas: Vec<SpaceDelta>) -> Self {
        let mut next = self.clone();
        next.revision = revision;
        for delta in deltas {
            match delta {
                SpaceDelta::SpaceUpdated(space) => {
                    Arc::make_mut(&mut next.core).space = space.into_parts().0;
                }
                SpaceDelta::SettingsUpdated(settings) => {
                    Arc::make_mut(&mut next.core).settings = settings;
                }
                SpaceDelta::InviteTokenUpdated(token) => {
                    Arc::make_mut(&mut next.core).space.invite_token = token;
                }
                SpaceDelta::ChannelUpserted(channel) => {
                    Arc::make_mut(&mut next.core)
                        .channels
                        .insert(channel.id, channel);
                }
                SpaceDelta::ChannelDeleted(channel_id) => {
                    Arc::make_mut(&mut next.core).channels.remove(&channel_id);
                    Arc::make_mut(&mut next.members)
                        .channel_members
                        .remove(&channel_id);
                }
                SpaceDelta::CharacterUpserted(character) => {
                    Arc::make_mut(&mut next.scopes)
                        .characters
                        .insert(character.id, character);
                }
                SpaceDelta::CharacterDeleted(character_id) => {
                    Arc::make_mut(&mut next.scopes)
                        .characters
                        .remove(&character_id);
                }
                SpaceDelta::NoteUpserted(note) => {
                    Arc::make_mut(&mut next.notes).notes.insert(note.id, note);
                }
                SpaceDelta::ScopeUpserted(scope) => {
                    Arc::make_mut(&mut next.scopes)
                        .scopes
                        .insert(scope.id, scope);
                }
                SpaceDelta::ScopeDeleted(scope_id) => {
                    Arc::make_mut(&mut next.scopes).scopes.remove(&scope_id);
                    Arc::make_mut(&mut next.entries).entries.remove(&scope_id);
                }
                SpaceDelta::EntryUpserted(entry) => {
                    Arc::make_mut(&mut next.entries).upsert(entry);
                }
                SpaceDelta::EntryDeleted { scope_id, entry_id } => {
                    Arc::make_mut(&mut next.entries).remove(scope_id, entry_id);
                }
                SpaceDelta::SpaceMemberUpserted(member) => {
                    Arc::make_mut(&mut next.members)
                        .space_members
                        .insert(member.user_id, member);
                }
                SpaceDelta::SpaceMemberRemoved {
                    user_id,
                    channel_ids,
                } => {
                    let members = Arc::make_mut(&mut next.members);
                    members.space_members.remove(&user_id);
                    for channel_id in channel_ids {
                        members.remove_channel_member(channel_id, user_id);
                    }
                }
                SpaceDelta::ChannelMemberUpserted(member) => {
                    Arc::make_mut(&mut next.members).upsert_channel_member(member);
                }
                SpaceDelta::ChannelMemberRemoved {
                    channel_id,
                    user_id,
                } => {
                    Arc::make_mut(&mut next.members).remove_channel_member(channel_id, user_id);
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
    #[error(transparent)]
    SpacePayloadCache(#[from] crate::space_payload_cache::Error),
    #[error("space runtime control queue is closed")]
    Closed,
    #[error("space runtime mutation queue is full")]
    Busy,
    #[error("space runtime mutation is no longer active")]
    InvalidMutation,
    #[error("space runtime snapshot refresh failed")]
    RefreshFailed,
}

pub(crate) struct SpaceRuntime {
    space_id: Uuid,
    db: sqlx::PgPool,
    snapshot: ArcSwap<SpaceSnapshot>,
    verified_at: parking_lot::Mutex<Instant>,
    dirty: AtomicBool,
    next_ticket: AtomicU64,
    reconciliation_pending: AtomicBool,
    authoritative_notify: tokio::sync::Notify,
    control_tx: mpsc::Sender<ControlCommand>,
    active_mutations: AtomicU64,
    control_queue_depth: AtomicU64,
    mutation_queue_depth: AtomicU64,
}

impl SpaceRuntime {
    async fn load(db: &sqlx::PgPool, space_id: Uuid) -> Result<Arc<Self>, SpaceRuntimeError> {
        let started = Instant::now();
        let result = Self::load_snapshot(db, space_id, 0).await;
        metrics::histogram!("boluo_server_space_runtime_load_duration_seconds")
            .record(started.elapsed().as_secs_f64());
        let result_label = match &result {
            Ok(_) => "success",
            Err(SpaceRuntimeError::NotFound) => "not_found",
            Err(_) => "database_error",
        };
        metrics::counter!("boluo_server_space_runtime_load_total", "result" => result_label)
            .increment(1);
        let snapshot = result?;
        let (control_tx, control_rx) = mpsc::channel(96);
        let runtime = Arc::new(Self {
            space_id,
            db: db.clone(),
            snapshot: ArcSwap::from_pointee(snapshot),
            verified_at: parking_lot::Mutex::new(Instant::now()),
            dirty: AtomicBool::new(false),
            next_ticket: AtomicU64::new(0),
            reconciliation_pending: AtomicBool::new(false),
            authoritative_notify: tokio::sync::Notify::new(),
            control_tx,
            active_mutations: AtomicU64::new(0),
            control_queue_depth: AtomicU64::new(0),
            mutation_queue_depth: AtomicU64::new(0),
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

        let space = Space::get_by_id(&mut *transaction, &space_id)
            .await?
            .ok_or(SpaceRuntimeError::NotFound)?;
        let settings = sqlx::query_file_scalar!("sql/spaces/get_settings.sql", space_id)
            .fetch_optional(&mut *transaction)
            .await?
            .unwrap_or_else(|| serde_json::json!({}));
        let channels: SnapshotMap<_, _> =
            sqlx::query_file_scalar!("sql/channels/get_by_space.sql", space_id)
                .fetch_all(&mut *transaction)
                .await?
                .into_iter()
                .map(|channel: Channel| (channel.id, channel))
                .collect();
        let characters: SnapshotMap<_, _> = Character::list_by_space(&mut *transaction, &space_id)
            .await?
            .into_iter()
            .map(|character: Character| (character.id, character))
            .collect();
        let notes: SnapshotMap<_, _> =
            NoteMetadata::list_by_space(&mut *transaction, space_id, true)
                .await?
                .into_iter()
                .map(|note| (note.id, note))
                .collect();
        let scopes: SnapshotMap<_, _> = Scope::list_by_space(&mut transaction, space_id)
            .await?
            .into_iter()
            .map(|scope: Scope| (scope.id, scope))
            .collect();
        let entries =
            Self::index_entries(EntryMetadata::list_by_space(&mut transaction, space_id).await?);
        let space_members: SnapshotMap<_, _> =
            sqlx::query_file_scalar!("sql/spaces/get_members_by_space.sql", space_id)
                .fetch_all(&mut *transaction)
                .await?
                .into_iter()
                .map(|member: SpaceMember| (member.user_id, member))
                .collect();
        let channel_members = Self::index_channel_members(
            sqlx::query_file_scalar!("sql/channels/get_joined_members_by_space.sql", space_id)
                .fetch_all(&mut *transaction)
                .await?,
        );
        let database_fingerprint =
            Self::load_database_fingerprint(&mut *transaction, space_id).await?;
        transaction.commit().await?;

        let (space, latest_activity) = space.into_parts();
        Ok(SpaceSnapshot {
            revision,
            database_fingerprint,
            latest_activity_us: Arc::new(AtomicI64::new(
                latest_activity.unix_timestamp_nanos() as i64 / 1_000,
            )),
            core: Arc::new(CoreSnapshot {
                space,
                settings,
                channels,
            }),
            members: Arc::new(MembersSnapshot {
                space_members,
                channel_members,
            }),
            notes: Arc::new(NotesSnapshot { notes }),
            scopes: Arc::new(ScopesSnapshot { characters, scopes }),
            entries: Arc::new(EntriesSnapshot { entries }),
        })
    }

    async fn load_database_fingerprint<'c, T>(
        db: T,
        space_id: Uuid,
    ) -> Result<DatabaseFingerprint, sqlx::Error>
    where
        T: sqlx::PgExecutor<'c>,
    {
        sqlx::query_as::<_, DatabaseFingerprintRow>(include_str!(
            "../sql/spaces/snapshot_fingerprint.sql"
        ))
        .bind(space_id)
        .fetch_all(db)
        .await
        .map(DatabaseFingerprint::from_rows)
    }

    fn index_entries(
        entries: Vec<EntryMetadata>,
    ) -> SnapshotMap<Uuid, Arc<SnapshotMap<Uuid, EntryMetadata>>> {
        let mut entries_by_scope = SnapshotMap::<Uuid, SnapshotMap<Uuid, EntryMetadata>>::default();
        for entry in entries {
            let scope_id = entry.scope_id;
            entries_by_scope
                .entry(scope_id)
                .or_default()
                .insert(entry.id, entry);
        }
        entries_by_scope
            .into_iter()
            .map(|(scope_id, entries)| (scope_id, Arc::new(entries)))
            .collect()
    }

    fn index_channel_members(
        channel_members: Vec<ChannelMember>,
    ) -> SnapshotMap<Uuid, Arc<SnapshotMap<Uuid, ChannelMember>>> {
        let mut channel_members_by_channel =
            SnapshotMap::<Uuid, SnapshotMap<Uuid, ChannelMember>>::default();
        for member in channel_members {
            let members = channel_members_by_channel
                .entry(member.channel_id)
                .or_default();
            members.insert(member.user_id, member);
        }
        channel_members_by_channel
            .into_iter()
            .map(|(channel_id, members)| (channel_id, Arc::new(members)))
            .collect()
    }

    async fn reconcile_snapshot(
        db: &sqlx::PgPool,
        space_id: Uuid,
        revision: u64,
        current: &SpaceSnapshot,
    ) -> Result<ReconciliationResult, SpaceRuntimeError> {
        let mut transaction = db.begin().await?;
        sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
            .execute(&mut *transaction)
            .await?;
        let probe_started = Instant::now();
        let database_fingerprint =
            match Self::load_database_fingerprint(&mut *transaction, space_id).await {
                Ok(fingerprint) => fingerprint,
                Err(error) => {
                    metrics::counter!(
                        "boluo_server_space_runtime_reconciliation_probe_total",
                        "result" => "error"
                    )
                    .increment(1);
                    metrics::histogram!(
                        "boluo_server_space_runtime_reconciliation_probe_duration_seconds",
                        "result" => "error"
                    )
                    .record(probe_started.elapsed().as_secs_f64());
                    return Err(error.into());
                }
            };
        let changed = database_fingerprint.changed_sections(&current.database_fingerprint);
        let result_label = if changed.any() {
            "changed"
        } else {
            "unchanged"
        };
        metrics::counter!(
            "boluo_server_space_runtime_reconciliation_probe_total",
            "result" => result_label
        )
        .increment(1);
        metrics::histogram!(
            "boluo_server_space_runtime_reconciliation_probe_duration_seconds",
            "result" => result_label
        )
        .record(probe_started.elapsed().as_secs_f64());
        if !changed.any() {
            transaction.commit().await?;
            return Ok(ReconciliationResult::Unchanged);
        }

        let mut next = current.clone();
        next.revision = revision;
        next.database_fingerprint = database_fingerprint;
        if changed.core {
            let space = SpaceRecord::get_by_id(&mut *transaction, &space_id)
                .await?
                .ok_or(SpaceRuntimeError::NotFound)?;
            let settings = sqlx::query_file_scalar!("sql/spaces/get_settings.sql", space_id)
                .fetch_optional(&mut *transaction)
                .await?
                .unwrap_or_else(|| serde_json::json!({}));
            let channels = sqlx::query_file_scalar!("sql/channels/get_by_space.sql", space_id)
                .fetch_all(&mut *transaction)
                .await?
                .into_iter()
                .map(|channel: Channel| (channel.id, channel))
                .collect();
            next.core = Arc::new(CoreSnapshot {
                space,
                settings,
                channels,
            });
        }
        if changed.scopes {
            let characters = Character::list_by_space(&mut *transaction, &space_id)
                .await?
                .into_iter()
                .map(|character| (character.id, character))
                .collect();
            let scopes = Scope::list_by_space(&mut transaction, space_id)
                .await?
                .into_iter()
                .map(|scope| (scope.id, scope))
                .collect();
            next.scopes = Arc::new(ScopesSnapshot { characters, scopes });
        }
        if changed.notes {
            let notes = NoteMetadata::list_by_space(&mut *transaction, space_id, true)
                .await?
                .into_iter()
                .map(|note| (note.id, note))
                .collect();
            next.notes = Arc::new(NotesSnapshot { notes });
        }
        if changed.entries {
            let entries = Self::index_entries(
                EntryMetadata::list_by_space(&mut transaction, space_id).await?,
            );
            next.entries = Arc::new(EntriesSnapshot { entries });
        }
        if changed.members {
            let space_members =
                sqlx::query_file_scalar!("sql/spaces/get_members_by_space.sql", space_id)
                    .fetch_all(&mut *transaction)
                    .await?
                    .into_iter()
                    .map(|member: SpaceMember| (member.user_id, member))
                    .collect();
            let channel_members = Self::index_channel_members(
                sqlx::query_file_scalar!("sql/channels/get_joined_members_by_space.sql", space_id)
                    .fetch_all(&mut *transaction)
                    .await?,
            );
            next.members = Arc::new(MembersSnapshot {
                space_members,
                channel_members,
            });
        }
        transaction.commit().await?;
        Ok(ReconciliationResult::Refreshed {
            snapshot: Arc::new(next),
            changed,
        })
    }

    pub(crate) fn space_id(&self) -> Uuid {
        self.space_id
    }

    pub(crate) fn snapshot(&self) -> Arc<SpaceSnapshot> {
        self.snapshot.load_full()
    }

    fn record_latest_activity(&self, update_time: OffsetDateTime) {
        self.snapshot().latest_activity_us.fetch_max(
            update_time.unix_timestamp_nanos() as i64 / 1_000,
            Ordering::Relaxed,
        );
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
        let (ticket, ack_rx) = self.enqueue_refresh(SnapshotReloadReason::Unguarded, None)?;
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
        reason: SnapshotReloadReason,
        reconciliation_permit: Option<tokio::sync::OwnedSemaphorePermit>,
    ) -> Result<(u64, oneshot::Receiver<Result<u64, SpaceRuntimeError>>), SpaceRuntimeError> {
        let ticket = self.next_ticket.fetch_add(1, Ordering::AcqRel) + 1;
        self.dirty.store(true, Ordering::Release);
        self.enqueue_refresh_command(ticket, reason, reconciliation_permit)
    }

    fn enqueue_reconciliation(
        &self,
        reconciliation_permit: tokio::sync::OwnedSemaphorePermit,
    ) -> Result<(u64, oneshot::Receiver<Result<u64, SpaceRuntimeError>>), SpaceRuntimeError> {
        // Reconciliation is a best-effort verification, not evidence of a committed
        // change. Keep serving the current snapshot while the actor reloads it.
        let ticket = self.next_ticket.load(Ordering::Acquire);
        self.enqueue_refresh_command(
            ticket,
            SnapshotReloadReason::Reconciliation,
            Some(reconciliation_permit),
        )
    }

    fn enqueue_refresh_command(
        &self,
        ticket: u64,
        reason: SnapshotReloadReason,
        reconciliation_permit: Option<tokio::sync::OwnedSemaphorePermit>,
    ) -> Result<(u64, oneshot::Receiver<Result<u64, SpaceRuntimeError>>), SpaceRuntimeError> {
        let (ack_tx, ack_rx) = oneshot::channel();
        let command = RefreshCommand {
            ticket,
            reason,
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
                metrics::counter!(
                    "boluo_server_space_runtime_refresh_failed_total",
                    "reason" => reason.as_str()
                )
                .increment(1);
                return Err(SpaceRuntimeError::Closed);
            }
        }
        Ok((ticket, ack_rx))
    }

    fn needs_reconciliation(&self, max_age: Duration) -> bool {
        self.active_mutations.load(Ordering::Acquire) == 0
            && !self.reconciliation_pending.load(Ordering::Acquire)
            && self.verified_at.lock().elapsed() >= max_age
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
                    event = "space_runtime.reconciliation.enqueue_failed",
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

    async fn prepare_mutation(&self, mutation_token: u64) -> Result<(), SpaceRuntimeError> {
        let (prepared_tx, prepared_rx) = oneshot::channel();
        self.control_tx
            .send(ControlCommand::PrepareMutation {
                mutation_token,
                prepared: prepared_tx,
            })
            .await
            .map_err(|_| SpaceRuntimeError::Closed)?;
        prepared_rx.await.unwrap_or(Err(SpaceRuntimeError::Closed))
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
            runtime
                .control_queue_depth
                .store(control_rx.len() as u64, Ordering::Release);
            match command {
                ControlCommand::BeginMutation { queued_at, granted } => {
                    state
                        .pending_mutations
                        .push_back(PendingMutation { queued_at, granted });
                    runtime
                        .mutation_queue_depth
                        .store(state.pending_mutations.len() as u64, Ordering::Release);
                    Self::grant_next_mutation(&runtime, &mut state).await;
                }
                ControlCommand::PrepareMutation {
                    mutation_token,
                    prepared,
                } => {
                    let result =
                        Self::prepare_active_mutation(&runtime, &mut state, mutation_token);
                    let _ = prepared.send(result);
                }
                ControlCommand::FinishMutation { mutation_token } => {
                    Self::finish_active_mutation(&runtime, &mut state, mutation_token).await;
                    Self::flush_deferred_refreshes(&runtime, &mut state).await;
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
                    if state.active_mutation.is_some() {
                        metrics::counter!(
                            "boluo_server_space_runtime_refresh_deferred_total",
                            "reason" => command.reason.as_str()
                        )
                        .increment(1);
                        state.deferred_refreshes.push(command);
                        continue;
                    }
                    let is_reconciliation = command.reconciliation_permit.is_some();
                    let result =
                        Self::reload_snapshot(&runtime, &state, command.ticket, command.reason)
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

    async fn flush_deferred_refreshes(runtime: &Arc<Self>, state: &mut ControlState) {
        if state.active_mutation.is_some() || state.deferred_refreshes.is_empty() {
            return;
        }

        let commands = std::mem::take(&mut state.deferred_refreshes);
        let has_reconciliation = commands
            .iter()
            .any(|command| command.reconciliation_permit.is_some());
        let has_committed_refresh = commands
            .iter()
            .any(|command| matches!(command.reason, SnapshotReloadReason::Unguarded));
        let requested_ticket = commands
            .iter()
            .map(|command| command.ticket)
            .max()
            .unwrap_or_else(|| runtime.next_ticket.load(Ordering::Acquire));
        let current = runtime.snapshot();
        let committed_refresh_is_covered =
            !runtime.dirty.load(Ordering::Acquire) && current.revision >= requested_ticket;
        let ticket = requested_ticket
            .max(current.revision)
            .max(runtime.next_ticket.load(Ordering::Acquire));

        let result = if has_reconciliation {
            let reason = if has_committed_refresh && !committed_refresh_is_covered {
                // A pending committed refresh makes a payload mismatch expected.
                SnapshotReloadReason::Unguarded
            } else {
                SnapshotReloadReason::Reconciliation
            };
            Self::reload_snapshot(runtime, state, ticket, reason).await
        } else if committed_refresh_is_covered {
            Ok(ticket)
        } else {
            Self::reload_snapshot(runtime, state, ticket, SnapshotReloadReason::Unguarded).await
        };

        let reload_count = usize::from(has_reconciliation || !committed_refresh_is_covered);
        let coalesced_count = commands.len().saturating_sub(reload_count);
        if coalesced_count > 0 {
            metrics::counter!("boluo_server_space_runtime_refresh_coalesced_total")
                .increment(coalesced_count as u64);
        }

        match result {
            Ok(ticket) => {
                for command in commands {
                    let _ = command.ack.send(Ok(ticket));
                }
            }
            Err(_) => {
                for command in commands {
                    let _ = command.ack.send(Err(SpaceRuntimeError::RefreshFailed));
                }
            }
        }
        if has_reconciliation {
            runtime
                .reconciliation_pending
                .store(false, Ordering::Release);
        }
    }

    async fn grant_next_mutation(runtime: &Arc<Self>, state: &mut ControlState) {
        while state.active_mutation.is_none() {
            let Some(command) = state.pending_mutations.pop_front() else {
                return;
            };
            metrics::histogram!("boluo_server_space_runtime_mutation_queue_wait_seconds")
                .record(command.queued_at.elapsed().as_secs_f64());
            runtime
                .mutation_queue_depth
                .store(state.pending_mutations.len() as u64, Ordering::Release);
            state.next_mutation_token += 1;
            let mutation_token = state.next_mutation_token;
            state.active_mutation = Some(ActiveMutation {
                mutation_token,
                prepared: None,
                published: false,
                started_at: Instant::now(),
            });
            if command.granted.send(mutation_token).is_ok() {
                return;
            }

            runtime.active_mutations.fetch_sub(1, Ordering::AcqRel);
            state.active_mutation = None;
        }
    }

    fn prepare_active_mutation(
        runtime: &Arc<Self>,
        state: &mut ControlState,
        mutation_token: u64,
    ) -> Result<(), SpaceRuntimeError> {
        let Some(active) = state.active_mutation.as_mut() else {
            return Err(SpaceRuntimeError::InvalidMutation);
        };
        if active.mutation_token != mutation_token {
            tracing::warn!(
                event = "space_runtime.mutation.prepare_rejected",
                space_id = %runtime.space_id,
                mutation_token,
                active_mutation_token = active.mutation_token,
                "Rejected preparation for a non-active Space mutation"
            );
            return Err(SpaceRuntimeError::InvalidMutation);
        }
        if active.prepared.is_some() {
            return Ok(());
        }

        let current_revision = runtime.snapshot().revision;
        let generation = runtime.next_ticket.load(Ordering::Acquire);
        let was_authoritative =
            !runtime.dirty.load(Ordering::Acquire) && generation == current_revision;
        let reserved_ticket = runtime.reserve_generation();
        let base_revision =
            (was_authoritative && reserved_ticket == generation + 1).then_some(current_revision);
        active.prepared = Some(PreparedMutation {
            base_revision,
            reserved_ticket,
            started_at: Instant::now(),
        });
        metrics::counter!("boluo_server_space_runtime_mutation_prepared_total").increment(1);
        Ok(())
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
                event = "space_runtime.mutation.completion_ignored",
                space_id = %runtime.space_id,
                mutation_token,
                active_mutation_token = active.mutation_token,
                "Ignored completion for a non-active Space mutation"
            );
            return;
        }
        let started_at = active.started_at;
        let prepared_at = active.prepared.as_ref().map(|prepared| prepared.started_at);
        let was_prepared = active.prepared.is_some();
        let repair_reason = if was_prepared && !active.published {
            Some("unpublished")
        } else if was_prepared && runtime.dirty.load(Ordering::Acquire) {
            Some("dirty")
        } else {
            None
        };
        state.active_mutation = None;
        runtime.active_mutations.fetch_sub(1, Ordering::AcqRel);
        metrics::histogram!("boluo_server_space_runtime_mutation_duration_seconds")
            .record(started_at.elapsed().as_secs_f64());
        if let Some(reason) = repair_reason {
            metrics::counter!(
                "boluo_server_space_runtime_mutation_repair_total",
                "reason" => reason
            )
            .increment(1);
            let ticket = runtime.reserve_generation();
            match Self::reload_snapshot(
                runtime,
                state,
                ticket,
                SnapshotReloadReason::MutationRepair,
            )
            .await
            {
                Ok(_) => {
                    if let Some(prepared_at) = prepared_at {
                        metrics::histogram!(
                            "boluo_server_space_runtime_mutation_dirty_duration_seconds",
                            "outcome" => "repaired"
                        )
                        .record(prepared_at.elapsed().as_secs_f64());
                    }
                }
                Err(error) => {
                    tracing::error!(
                        event = "space_runtime.mutation.recovery_failed",
                        %error,
                        space_id = %runtime.space_id,
                        mutation_token,
                        "Space runtime remains dirty after mutation recovery failure"
                    );
                }
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
                && active.prepared.as_ref().is_some_and(|prepared| {
                    prepared.base_revision == Some(current.revision)
                        && runtime.next_ticket.load(Ordering::Acquire) == prepared.reserved_ticket
                })
        });
        if can_apply_delta {
            let ticket = runtime.reserve_generation();
            let next = current.apply_deltas(ticket, deltas);
            runtime.snapshot.store(Arc::new(next));
            let mut prepared_at = None;
            if let Some(active) = state.active_mutation.as_mut() {
                if let Some(prepared) = active.prepared.as_mut() {
                    prepared_at = Some(prepared.started_at);
                    prepared.base_revision = None;
                }
                active.published = true;
            }
            runtime.update_dirty(state);
            if let Some(prepared_at) = prepared_at {
                metrics::histogram!(
                    "boluo_server_space_runtime_mutation_dirty_duration_seconds",
                    "outcome" => "delta"
                )
                .record(prepared_at.elapsed().as_secs_f64());
            }
            metrics::counter!("boluo_server_space_runtime_delta_applied_total").increment(1);
            return Ok(ticket);
        }

        if let Some(prepared) = state
            .active_mutation
            .as_mut()
            .and_then(|active| active.prepared.as_mut())
        {
            prepared.base_revision = None;
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
        let result =
            Self::reload_snapshot(runtime, state, ticket, SnapshotReloadReason::DeltaFallback)
                .await;
        if result.is_ok()
            && owns_mutation
            && let Some(active) = state.active_mutation.as_mut()
        {
            let prepared_at = active.prepared.as_ref().map(|prepared| prepared.started_at);
            active.published = true;
            runtime.update_dirty(state);
            if let Some(prepared_at) = prepared_at {
                metrics::histogram!(
                    "boluo_server_space_runtime_mutation_dirty_duration_seconds",
                    "outcome" => "fallback"
                )
                .record(prepared_at.elapsed().as_secs_f64());
            }
        }
        result
    }

    async fn reload_snapshot(
        runtime: &Arc<Self>,
        state: &ControlState,
        ticket: u64,
        reason: SnapshotReloadReason,
    ) -> Result<u64, SpaceRuntimeError> {
        if matches!(reason, SnapshotReloadReason::Reconciliation) {
            let current = runtime.snapshot();
            let authoritative = !runtime.dirty.load(Ordering::Acquire)
                && current.revision == runtime.next_ticket.load(Ordering::Acquire);
            if authoritative {
                let started = Instant::now();
                match Self::reconcile_snapshot(&runtime.db, runtime.space_id, ticket, &current)
                    .await
                {
                    Ok(ReconciliationResult::Unchanged) => {
                        *runtime.verified_at.lock() = Instant::now();
                        runtime.update_dirty(state);
                        return Ok(ticket);
                    }
                    Ok(ReconciliationResult::Refreshed { snapshot, changed }) => {
                        metrics::counter!(
                            "boluo_server_space_runtime_refresh_total",
                            "reason" => reason.as_str()
                        )
                        .increment(1);
                        metrics::histogram!(
                            "boluo_server_space_runtime_refresh_duration_seconds",
                            "reason" => reason.as_str()
                        )
                        .record(started.elapsed().as_secs_f64());
                        changed.record_refreshes();
                        current.payload_mismatch(&snapshot).report(runtime.space_id);
                        if current.revision <= ticket {
                            runtime.snapshot.store(snapshot);
                            *runtime.verified_at.lock() = Instant::now();
                        }
                        runtime.update_dirty(state);
                        return Ok(ticket);
                    }
                    Err(error) => {
                        metrics::counter!(
                            "boluo_server_space_runtime_reconciliation_selective_refresh_failed_total"
                        )
                        .increment(1);
                        tracing::warn!(
                            event = "space_runtime.reconciliation.selective_refresh_failed",
                            %error,
                            space_id = %runtime.space_id,
                            "Failed to selectively refresh the Space snapshot; falling back to a full refresh"
                        );
                    }
                }
            } else {
                tracing::debug!(
                    space_id = %runtime.space_id,
                    "Space runtime is dirty; reconciliation is using a full refresh"
                );
            }
        }

        let started = Instant::now();
        metrics::counter!(
            "boluo_server_space_runtime_refresh_total",
            "reason" => reason.as_str()
        )
        .increment(1);
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
                event = "space_runtime.snapshot.refresh_retry",
                space_id = %runtime.space_id,
                ticket,
                attempt = attempt + 1,
                "Failed to refresh Space runtime snapshot"
            );
        }
        metrics::histogram!(
            "boluo_server_space_runtime_refresh_duration_seconds",
            "reason" => reason.as_str()
        )
        .record(started.elapsed().as_secs_f64());

        match result {
            Ok(mut snapshot) => {
                let current = runtime.snapshot();
                if matches!(reason, SnapshotReloadReason::Reconciliation)
                    && current.revision <= ticket
                {
                    current.payload_mismatch(&snapshot).report(runtime.space_id);
                }
                let current_activity_us = current.latest_activity_us.clone();
                current_activity_us.fetch_max(
                    snapshot.latest_activity_us.load(Ordering::Relaxed),
                    Ordering::Relaxed,
                );
                snapshot.latest_activity_us = current_activity_us;
                if current.revision <= ticket {
                    runtime.snapshot.store(Arc::new(snapshot));
                    *runtime.verified_at.lock() = Instant::now();
                }
                runtime.update_dirty(state);
                Ok(ticket)
            }
            Err(error) => {
                metrics::counter!(
                    "boluo_server_space_runtime_refresh_failed_total",
                    "reason" => reason.as_str()
                )
                .increment(1);
                tracing::error!(
                    event = "space_runtime.snapshot.refresh_failed",
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
            .is_some_and(|active| active.prepared.is_some() && !active.published);
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
    reason: SnapshotReloadReason,
    ack: oneshot::Sender<Result<u64, SpaceRuntimeError>>,
    reconciliation_permit: Option<tokio::sync::OwnedSemaphorePermit>,
}

#[derive(Clone, Copy)]
enum SnapshotReloadReason {
    Reconciliation,
    MutationRepair,
    DeltaFallback,
    Unguarded,
}

impl SnapshotReloadReason {
    fn as_str(self) -> &'static str {
        match self {
            Self::Reconciliation => "reconciliation",
            Self::MutationRepair => "mutation_repair",
            Self::DeltaFallback => "delta_fallback",
            Self::Unguarded => "unguarded",
        }
    }
}

enum ControlCommand {
    BeginMutation {
        queued_at: Instant,
        granted: oneshot::Sender<u64>,
    },
    PrepareMutation {
        mutation_token: u64,
        prepared: oneshot::Sender<Result<(), SpaceRuntimeError>>,
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
    prepared: Option<PreparedMutation>,
    published: bool,
    started_at: Instant,
}

struct PreparedMutation {
    base_revision: Option<u64>,
    reserved_ticket: u64,
    started_at: Instant,
}

#[derive(Default)]
struct ControlState {
    next_mutation_token: u64,
    active_mutation: Option<ActiveMutation>,
    pending_mutations: VecDeque<PendingMutation>,
    deferred_refreshes: Vec<RefreshCommand>,
}

pub(crate) struct SpaceMutationGuard {
    runtime: Weak<SpaceRuntime>,
    space_id: Uuid,
    mutation_token: u64,
}

pub(crate) struct CommittedSpaceMutation {
    guard: SpaceMutationGuard,
}

#[derive(Clone, Copy)]
pub(crate) struct SpaceMutationProof {
    space_id: Uuid,
    mutation_token: u64,
}

impl SpaceMutationGuard {
    async fn prepare(self) -> Result<CommittedSpaceMutation, SpaceRuntimeError> {
        let Some(runtime) = self.runtime.upgrade() else {
            return Err(SpaceRuntimeError::Closed);
        };
        runtime.prepare_mutation(self.mutation_token).await?;
        Ok(CommittedSpaceMutation { guard: self })
    }

    pub(crate) async fn commit(
        self,
        transaction: sqlx::Transaction<'_, sqlx::Postgres>,
    ) -> Result<CommittedSpaceMutation, SpaceRuntimeError> {
        let committed = self.prepare().await?;
        transaction.commit().await?;
        Ok(committed)
    }
}

impl CommittedSpaceMutation {
    pub(crate) fn proof(&self) -> SpaceMutationProof {
        SpaceMutationProof {
            space_id: self.guard.space_id,
            mutation_token: self.guard.mutation_token,
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
    runtimes: papaya::HashMap<Uuid, Arc<SpaceRuntimeHandle>, ahash::RandomState>,
    space_payload_cache: SpacePayloadCache,
    reconciliation_permits: Arc<tokio::sync::Semaphore>,
    reconciliation_cursor: AtomicU64,
    #[cfg(test)]
    load_count: std::sync::atomic::AtomicUsize,
}

struct SpaceRuntimeHandle {
    runtime: tokio::sync::OnceCell<Arc<SpaceRuntime>>,
    state: std::sync::Mutex<SpaceRuntimeHandleState>,
}

struct SpaceRuntimeHandleState {
    last_touched: Instant,
    leases: u64,
    evicting: bool,
}

struct SpaceRuntimeLease {
    handle: Arc<SpaceRuntimeHandle>,
}

impl SpaceRuntimeHandle {
    fn new() -> Self {
        Self {
            runtime: tokio::sync::OnceCell::new(),
            state: std::sync::Mutex::new(SpaceRuntimeHandleState {
                last_touched: Instant::now(),
                leases: 0,
                evicting: false,
            }),
        }
    }

    fn acquire(handle: &Arc<Self>) -> Option<SpaceRuntimeLease> {
        let mut state = handle
            .state
            .lock()
            .expect("Space runtime handle state mutex poisoned");
        if state.evicting {
            return None;
        }
        state.last_touched = Instant::now();
        state.leases += 1;
        drop(state);
        Some(SpaceRuntimeLease {
            handle: handle.clone(),
        })
    }

    fn is_idle(&self, max_idle: Duration) -> bool {
        self.state
            .lock()
            .expect("Space runtime handle state mutex poisoned")
            .last_touched
            .elapsed()
            >= max_idle
    }

    fn mark_evicting_if_idle(&self, max_idle: Duration) -> bool {
        let mut state = self
            .state
            .lock()
            .expect("Space runtime handle state mutex poisoned");
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
            .expect("Space runtime handle state mutex poisoned")
            .evicting = true;
    }

    fn touch_runtime_if_active(&self) -> Option<Arc<SpaceRuntime>> {
        let mut state = self
            .state
            .lock()
            .expect("Space runtime handle state mutex poisoned");
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
            .expect("Space runtime handle state mutex poisoned");
        if state.evicting {
            return None;
        }
        self.runtime.get().cloned()
    }
}

impl Drop for SpaceRuntimeLease {
    fn drop(&mut self) {
        let mut state = self
            .handle
            .state
            .lock()
            .expect("Space runtime handle state mutex poisoned");
        state.leases = state
            .leases
            .checked_sub(1)
            .expect("Space runtime lease count underflow");
    }
}

impl SpaceStore {
    pub(crate) fn new(db: sqlx::PgPool) -> Self {
        Self::with_space_payload_cache(
            db,
            SpacePayloadCache::memory_only(crate::space_payload_cache::DEFAULT_MEMORY_CACHE_BYTES),
        )
    }

    pub(crate) fn with_space_payload_cache(
        db: sqlx::PgPool,
        space_payload_cache: SpacePayloadCache,
    ) -> Self {
        let store = Self {
            inner: Arc::new(SpaceStoreInner {
                db,
                runtimes: papaya::HashMap::builder()
                    .capacity(256)
                    .hasher(ahash::RandomState::new())
                    .resize_mode(papaya::ResizeMode::Blocking)
                    .build(),
                space_payload_cache,
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
        let handle = self.inner.runtimes.pin().get(space_id).cloned()?;
        // Cloning the Runtime while holding the handle lock prevents idle eviction
        // after the lock is released, without a separate short-lived lease.
        handle.touch_runtime_if_active()
    }

    #[cfg(test)]
    async fn get_with_hook<F>(
        &self,
        space_id: &Uuid,
        after_handle_acquire: F,
    ) -> Option<Arc<SpaceRuntime>>
    where
        F: Future<Output = ()>,
    {
        let handle = self.inner.runtimes.pin().get(space_id).cloned()?;
        let _lease = SpaceRuntimeHandle::acquire(&handle)?;
        after_handle_acquire.await;
        handle.runtime_if_active()
    }

    pub(crate) fn update_metrics(&self) {
        self.inner.space_payload_cache.update_metrics();
        let mut loaded = 0_u64;
        let mut dirty = 0_u64;
        let mut mutations_in_flight = 0_u64;
        let mut control_queue_depth = 0_u64;
        let mut mutation_queue_depth = 0_u64;
        let mut snapshot_channels = 0_u64;
        let mut snapshot_characters = 0_u64;
        let mut snapshot_notes = 0_u64;
        let mut snapshot_scopes = 0_u64;
        let mut snapshot_entries = 0_u64;
        let mut snapshot_space_members = 0_u64;
        let mut snapshot_channel_members = 0_u64;
        for (_, handle) in self.inner.runtimes.pin().iter() {
            let Some(runtime) = handle.runtime_if_active() else {
                continue;
            };
            loaded += 1;
            dirty += runtime.dirty.load(Ordering::Acquire) as u64;
            mutations_in_flight += runtime.active_mutations.load(Ordering::Acquire);
            control_queue_depth += runtime.control_queue_depth.load(Ordering::Acquire);
            mutation_queue_depth += runtime.mutation_queue_depth.load(Ordering::Acquire);
            let snapshot = runtime.snapshot();
            snapshot_channels += snapshot.channels().len() as u64;
            snapshot_characters += snapshot.characters().len() as u64;
            snapshot_notes += snapshot.notes().len() as u64;
            snapshot_scopes += snapshot.scopes().len() as u64;
            snapshot_entries += snapshot
                .entries()
                .values()
                .map(|entries| entries.len() as u64)
                .sum::<u64>();
            snapshot_space_members += snapshot.space_members().len() as u64;
            snapshot_channel_members += snapshot
                .channel_members()
                .values()
                .map(|members| members.len() as u64)
                .sum::<u64>();
        }

        metrics::gauge!("boluo_server_space_runtime_loaded").set(loaded as f64);
        metrics::gauge!("boluo_server_space_runtime_dirty").set(dirty as f64);
        metrics::gauge!("boluo_server_space_runtime_mutations_in_flight")
            .set(mutations_in_flight as f64);
        metrics::gauge!("boluo_server_space_runtime_control_queue_depth")
            .set(control_queue_depth as f64);
        metrics::gauge!("boluo_server_space_runtime_mutation_queue_depth")
            .set(mutation_queue_depth as f64);
        metrics::gauge!("boluo_server_space_runtime_snapshot_items", "kind" => "channels")
            .set(snapshot_channels as f64);
        metrics::gauge!("boluo_server_space_runtime_snapshot_items", "kind" => "characters")
            .set(snapshot_characters as f64);
        metrics::gauge!("boluo_server_space_runtime_snapshot_items", "kind" => "notes")
            .set(snapshot_notes as f64);
        metrics::gauge!("boluo_server_space_runtime_snapshot_items", "kind" => "scopes")
            .set(snapshot_scopes as f64);
        metrics::gauge!("boluo_server_space_runtime_snapshot_items", "kind" => "entries")
            .set(snapshot_entries as f64);
        metrics::gauge!("boluo_server_space_runtime_snapshot_items", "kind" => "space_members")
            .set(snapshot_space_members as f64);
        metrics::gauge!("boluo_server_space_runtime_snapshot_items", "kind" => "channel_members")
            .set(snapshot_channel_members as f64);
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
        update_time: OffsetDateTime,
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
            && let Some(channel) = snapshot.channels().get(&channel_id).cloned()
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
                && let Some(channel) = snapshot.channels().get(&channel_id).cloned()
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
            && let Some(channel) = snapshot.channels().get(&channel_id).cloned()
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
            return Ok(snapshot.characters().get(&character_id).cloned());
        }

        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        Character::get_by_id_in_space(&self.inner.db, space_id, &character_id)
            .await
            .map_err(Into::into)
    }

    pub(crate) async fn resolve_note_metadata(
        &self,
        space_id: Uuid,
        note_id: Uuid,
    ) -> Result<Option<NoteMetadata>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        if let Some(snapshot) = runtime.authoritative_snapshot_after_wait().await {
            metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit")
                .increment(1);
            return Ok(snapshot.notes().get(&note_id).cloned());
        }

        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        NoteMetadata::get_by_id(&self.inner.db, space_id, note_id)
            .await
            .map_err(Into::into)
    }

    pub(crate) async fn resolve_note(
        &self,
        space_id: Uuid,
        note_id: Uuid,
    ) -> Result<Option<Note>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        let Some(snapshot) = runtime.authoritative_snapshot_after_wait().await else {
            return Note::get_by_id(&self.inner.db, space_id, note_id)
                .await
                .map_err(Into::into);
        };
        let Some(expected_note) = snapshot.notes().get(&note_id) else {
            return Ok(None);
        };
        let expected_revision = expected_note.revision;
        let Some(payload) = self
            .inner
            .space_payload_cache
            .note_payload(&self.inner.db, space_id, note_id, expected_revision)
            .await?
        else {
            return Ok(None);
        };
        let Some(current) = runtime.authoritative_snapshot_after_wait().await else {
            return Note::get_by_id(&self.inner.db, space_id, note_id)
                .await
                .map_err(Into::into);
        };
        let Some(current_note) = current.notes().get(&note_id) else {
            return Ok(None);
        };
        if current_note.revision != expected_revision {
            return Note::get_by_id(&self.inner.db, space_id, note_id)
                .await
                .map_err(Into::into);
        }
        Ok(Some(payload.into_note(current_note.clone())))
    }

    pub(crate) async fn list_note_metadata(
        &self,
        space_id: Uuid,
        include_archived: bool,
    ) -> Result<Vec<NoteMetadata>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        if let Some(snapshot) = runtime.authoritative_snapshot_after_wait().await {
            metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit")
                .increment(1);
            let mut notes: Vec<_> = snapshot
                .notes()
                .values()
                .filter(|note| include_archived || note.archived_at.is_none())
                .cloned()
                .collect();
            notes.sort_unstable_by(|left, right| {
                right
                    .modified
                    .cmp(&left.modified)
                    .then_with(|| right.id.cmp(&left.id))
            });
            return Ok(notes);
        }

        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        NoteMetadata::list_by_space(&self.inner.db, space_id, include_archived)
            .await
            .map_err(Into::into)
    }

    pub(crate) async fn resolve_scope(
        &self,
        space_id: Uuid,
        scope_id: Uuid,
    ) -> Result<Option<Scope>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        if let Some(snapshot) = runtime.authoritative_snapshot_after_wait().await {
            metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit")
                .increment(1);
            return Ok(snapshot.scopes().get(&scope_id).cloned());
        }

        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        Scope::get_by_id(&self.inner.db, scope_id)
            .await
            .map(|scope| scope.filter(|scope| scope.space_id == space_id))
            .map_err(Into::into)
    }

    pub(crate) async fn list_entry_metadata(
        &self,
        space_id: Uuid,
        scope_id: Uuid,
    ) -> Result<Vec<EntryMetadata>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        if let Some(snapshot) = runtime.authoritative_snapshot_after_wait().await {
            metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit")
                .increment(1);
            let mut entries: Vec<_> = snapshot
                .entries()
                .get(&scope_id)
                .into_iter()
                .flat_map(|entries| entries.values())
                .cloned()
                .collect();
            entries.sort_unstable_by(|left, right| {
                left.pos
                    .total_cmp(&right.pos)
                    .then_with(|| left.id.cmp(&right.id))
            });
            return Ok(entries);
        }
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        EntryMetadata::list_by_scope(&self.inner.db, scope_id)
            .await
            .map_err(Into::into)
    }

    pub(crate) async fn resolve_entry(
        &self,
        space_id: Uuid,
        scope_id: Uuid,
        entry_id: Uuid,
    ) -> Result<Option<Entry>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        let Some(snapshot) = runtime.authoritative_snapshot_after_wait().await else {
            return Entry::get_by_id(&self.inner.db, scope_id, entry_id)
                .await
                .map_err(Into::into);
        };
        let Some(expected_entry) = snapshot
            .entries()
            .get(&scope_id)
            .and_then(|entries| entries.get(&entry_id))
        else {
            return Ok(None);
        };
        let expected_version = expected_entry.components_version;
        let components = self
            .inner
            .space_payload_cache
            .entry_components(&self.inner.db, entry_id, expected_version)
            .await?;
        let Some(current) = runtime.authoritative_snapshot_after_wait().await else {
            return Entry::get_by_id(&self.inner.db, scope_id, entry_id)
                .await
                .map_err(Into::into);
        };
        let Some(current_entry) = current
            .entries()
            .get(&scope_id)
            .and_then(|entries| entries.get(&entry_id))
        else {
            return Ok(None);
        };
        if current_entry.components_version != expected_version {
            return Entry::get_by_id(&self.inner.db, scope_id, entry_id)
                .await
                .map_err(Into::into);
        }
        return Ok(Some(current_entry.clone().with_components(components)));
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

    pub(crate) async fn resolve_channel_membership(
        &self,
        space_id: Uuid,
        channel_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<ChannelMembership>, SpaceRuntimeError> {
        let runtime = self.get_or_load(space_id).await?;
        if let Some(snapshot) = runtime.authoritative_snapshot_after_wait().await {
            metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit")
                .increment(1);
            return Ok(snapshot.channel_membership(channel_id, user_id));
        }

        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        ChannelMembership::get(&self.inner.db, space_id, channel_id, user_id)
            .await
            .map_err(Into::into)
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
        let (handle, _lease) = loop {
            let handle = self
                .inner
                .runtimes
                .pin()
                .get_or_insert_with(space_id, || Arc::new(SpaceRuntimeHandle::new()))
                .clone();
            if let Some(lease) = SpaceRuntimeHandle::acquire(&handle) {
                break (handle, lease);
            }
            tokio::task::yield_now().await;
        };
        after_miss.await;
        handle
            .runtime
            .get_or_try_init(|| async {
                #[cfg(test)]
                self.inner
                    .load_count
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                SpaceRuntime::load(&self.inner.db, space_id).await
            })
            .await?;
        handle
            .runtime_if_active()
            .ok_or(SpaceRuntimeError::NotFound)
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
        let _ = self.inner.runtimes.pin().remove_if(&space_id, |_, handle| {
            handle.mark_removed();
            true
        });
    }

    fn evict_idle(&self, max_idle: Duration) -> usize {
        let candidates: Vec<_> = self
            .inner
            .runtimes
            .pin()
            .iter()
            .filter(|(_, handle)| handle.is_idle(max_idle))
            .map(|(space_id, handle)| (*space_id, handle.clone()))
            .collect();
        let mut evicted = 0;
        for (space_id, expected_handle) in candidates {
            let pinned = self.inner.runtimes.pin();
            let result = pinned.remove_if(&space_id, |_, current_handle| {
                if !Arc::ptr_eq(current_handle, &expected_handle) {
                    return false;
                }
                current_handle.mark_evicting_if_idle(max_idle)
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
            .filter_map(|(_, handle)| handle.runtime_if_active())
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

    pub(crate) async fn close_space_payload_cache(&self) -> Result<(), foyer::Error> {
        self.inner.space_payload_cache.close().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::channels::ChannelType;
    use crate::committed_changes::CommittedChanges;
    use crate::context::AppContext;
    use crate::entries::models::{Entry, EntryComponentMutation, EntryMetadata};
    use crate::notes::Note;
    use crate::spaces::AccessPolicy;
    use crate::users::User;
    use serde_json::json;
    use shared_types::messages::Entities;
    use std::collections::BTreeMap;

    fn entry_metadata(scope_id: Uuid, id: Uuid, display_name: &str) -> EntryMetadata {
        EntryMetadata {
            id,
            scope_id,
            key: display_name.into(),
            aliases: Vec::new(),
            display_name: display_name.into(),
            reference_note_id: None,
            tags: Vec::new(),
            pos_p: 0,
            pos_q: 1,
            pos: 0.0,
            metadata_version: Uuid::new_v4(),
            components_version: Uuid::new_v4(),
            created: time::OffsetDateTime::UNIX_EPOCH,
            modified: time::OffsetDateTime::UNIX_EPOCH,
        }
    }

    #[test]
    fn entry_update_only_clones_the_target_scope() {
        let scope_a = Uuid::new_v4();
        let scope_b = Uuid::new_v4();
        let entry_a = Uuid::new_v4();
        let entry_b = Uuid::new_v4();
        let mut entries = EntriesSnapshot {
            entries: SnapshotMap::default(),
        };
        entries.upsert(entry_metadata(scope_a, entry_a, "before"));
        entries.upsert(entry_metadata(scope_b, entry_b, "unchanged"));
        let original = entries.clone();

        entries.upsert(entry_metadata(scope_a, entry_a, "after"));

        assert!(!Arc::ptr_eq(
            &original.entries[&scope_a],
            &entries.entries[&scope_a]
        ));
        assert!(Arc::ptr_eq(
            &original.entries[&scope_b],
            &entries.entries[&scope_b]
        ));
        assert_eq!(original.entries[&scope_a][&entry_a].display_name, "before");
        assert_eq!(entries.entries[&scope_a][&entry_a].display_name, "after");
    }

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
        let space_id = space.id;

        let store = SpaceStore::new(pool);
        let barrier = Arc::new(tokio::sync::Barrier::new(2));
        let first = {
            let store = store.clone();
            let barrier = barrier.clone();
            tokio::spawn(async move {
                store
                    .get_or_load_with_hook(space_id, async move {
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
                    .get_or_load_with_hook(space_id, async move {
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
        assert_eq!(snapshot.space().id, space_id);
        assert!(snapshot.channels().contains_key(&channel.id));
        assert!(snapshot.space_members().contains_key(&owner.id));
        assert_eq!(
            snapshot.channel_members()[&channel.id][&owner.id].character_name,
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
        let membership = ctx
            .space_store
            .resolve_channel_membership(space.id, channel.id, owner.id)
            .await
            .expect("failed to resolve channel membership")
            .expect("owner membership is missing from channel");
        assert!(membership.is_master);
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
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        ChannelMember::remove_user(&mut *transaction, owner.id, channel.id)
            .await
            .expect("failed to remove channel member");
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit Space mutation");
        assert!(
            ctx.space_store
                .resolve_channel_member(space.id, channel.id, owner.id)
                .await
                .expect("failed to use database fallback while runtime was dirty")
                .is_none(),
            "dirty runtime returned its stale member snapshot"
        );
        assert!(
            ctx.space_store
                .resolve_channel_membership(space.id, channel.id, owner.id)
                .await
                .expect("failed to use membership fallback while runtime was dirty")
                .is_none(),
            "dirty runtime returned its stale membership snapshot"
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
            ctx.space_store
                .resolve_channel_membership(space.id, channel.id, owner.id)
                .await
                .expect("failed to read refreshed channel membership")
                .is_none(),
            "refreshed runtime retained a removed membership"
        );
        assert!(
            crate::events::context::store()
                .get_manager(&space.id)
                .is_none(),
            "member refresh created mailbox state"
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_runtime_entry_order_matches_database(pool: sqlx::PgPool) {
        let (_owner, space, _) = create_space(&pool).await;
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let mut expected_order = Vec::new();
        for key in ["ä", "Z", "a"] {
            let entry = Entry::create(
                &mut transaction,
                space.scope_id,
                key.to_string(),
                Vec::new(),
                format!("{key} Entry"),
                None,
                BTreeMap::new(),
                Vec::new(),
                None,
            )
            .await
            .expect("failed to create Entry");
            expected_order.push(entry.id);
        }
        transaction
            .commit()
            .await
            .expect("failed to commit Entries");

        let expected_ids = expected_order;
        let database_ids: Vec<_> = EntryMetadata::list_by_scope(&pool, space.scope_id)
            .await
            .expect("failed to list database Entries")
            .into_iter()
            .map(|entry| entry.id)
            .collect();
        let ctx = AppContext::new(pool, None);
        let runtime_ids: Vec<_> = ctx
            .space_store
            .list_entry_metadata(space.id, space.scope_id)
            .await
            .expect("failed to list runtime Entries")
            .into_iter()
            .map(|entry| entry.id)
            .collect();

        assert_eq!(database_ids, expected_ids);
        assert_eq!(runtime_ids, database_ids);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_entries_are_resident_and_components_load_lazily(pool: sqlx::PgPool) {
        let (_owner, space, _) = create_space(&pool).await;
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let entry = Entry::create(
            &mut transaction,
            space.scope_id,
            "hp".to_string(),
            Vec::new(),
            "Hit Points".to_string(),
            None,
            BTreeMap::from([(
                "core/counter".to_string(),
                crate::entries::models::EntryComponentPayloadInput::json(json!({"value": 10})),
            )]),
            Vec::new(),
            None,
        )
        .await
        .expect("failed to create Entry");
        transaction.commit().await.expect("failed to commit Entry");

        let ctx = AppContext::new(pool.clone(), None);
        let runtime = ctx
            .space_store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");
        let snapshot = runtime
            .authoritative_snapshot()
            .expect("runtime snapshot is dirty");
        assert_eq!(
            snapshot
                .scopes()
                .get(&space.scope_id)
                .expect("Space Scope is not resident"),
            &Scope::get_by_id(&pool, space.scope_id)
                .await
                .expect("failed to load Space Scope")
                .expect("Space Scope is missing")
        );
        assert!(
            snapshot
                .entries()
                .get(&space.scope_id)
                .is_some_and(|entries| entries.contains_key(&entry.id))
        );
        let metadata = ctx
            .space_store
            .list_entry_metadata(space.id, space.scope_id)
            .await
            .expect("failed to list Entry metadata");
        assert_eq!(metadata.len(), 1);
        assert_eq!(metadata[0].key, "hp");
        let resolved = ctx
            .space_store
            .resolve_entry(space.id, space.scope_id, entry.id)
            .await
            .expect("failed to resolve Entry")
            .expect("Entry is missing");
        assert_eq!(
            resolved.components["core/counter"].json_data(),
            json!({"value": 10})
        );
        assert_eq!(resolved.components["core/counter"].schema_version(), 1);
        let component_version = resolved.components["core/counter"].version();
        drop(snapshot);
        drop(runtime);
        assert_eq!(ctx.space_store.evict_idle(Duration::ZERO), 1);
        let resolved = ctx
            .space_store
            .resolve_entry(space.id, space.scope_id, entry.id)
            .await
            .expect("failed to resolve Entry after Runtime eviction")
            .expect("Entry is missing after Runtime eviction");
        assert_eq!(
            resolved.components["core/counter"].json_data(),
            json!({"value": 10})
        );
        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire Entry mutation");
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        EntryMetadata::get_by_id_for_update(&mut transaction, entry.id)
            .await
            .expect("failed to lock Entry")
            .expect("Entry is missing");
        Entry::apply_component_mutations(
            &mut transaction,
            entry.id,
            &[EntryComponentMutation::Set {
                component_type: "core/counter".to_string(),
                expected_version: Some(component_version),
                payload: crate::entries::models::EntryComponentPayloadInput::json(json!({
                    "value": 7
                })),
            }],
        )
        .await
        .expect("failed to update Entry Component");
        let updated_metadata = EntryMetadata::get_by_id_for_update(&mut transaction, entry.id)
            .await
            .expect("failed to reload Entry metadata")
            .expect("Entry is missing after Component update");
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit Entry mutation");
        let mut changes = CommittedChanges::default();
        changes.entry_updated(space.id, &updated_metadata);
        changes.apply_with_mutation(&ctx, &mutation).await;
        drop(mutation);

        let resolved = ctx
            .space_store
            .resolve_entry(space.id, space.scope_id, entry.id)
            .await
            .expect("failed to resolve updated Entry")
            .expect("updated Entry is missing");
        assert_eq!(
            resolved.components["core/counter"].json_data(),
            json!({"value": 7})
        );
        assert_eq!(resolved.components["core/counter"].schema_version(), 1);

        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire Entry metadata mutation");
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let current = EntryMetadata::get_by_id_for_update(&mut transaction, entry.id)
            .await
            .expect("failed to lock Entry")
            .expect("Entry is missing");
        let updated = Entry::update(
            &mut transaction,
            current.scope_id,
            current.id,
            current.metadata_version,
            "stamina".to_string(),
            Vec::new(),
            "Stamina".to_string(),
            current.reference_note_id,
            Vec::new(),
        )
        .await
        .expect("failed to update Entry metadata")
        .expect("Entry metadata version is stale");
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit Entry metadata mutation");
        let mut changes = CommittedChanges::default();
        changes.entry_updated(space.id, &updated.metadata);
        changes.apply_with_mutation(&ctx, &mutation).await;
        drop(mutation);

        let metadata = ctx
            .space_store
            .list_entry_metadata(space.id, space.scope_id)
            .await
            .expect("failed to list updated Entry metadata");
        assert_eq!(metadata[0].key, "stamina");
        let resolved = ctx
            .space_store
            .resolve_entry(space.id, space.scope_id, entry.id)
            .await
            .expect("failed to resolve renamed Entry")
            .expect("renamed Entry is missing");
        assert_eq!(resolved.key, "stamina");
        assert_eq!(
            resolved.components["core/counter"].json_data(),
            json!({"value": 7})
        );

        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire Entry deletion mutation");
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        assert!(
            Entry::delete(
                &mut transaction,
                updated.scope_id,
                updated.id,
                updated.metadata_version,
            )
            .await
            .expect("failed to delete Entry")
        );
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit Entry deletion");
        let mut changes = CommittedChanges::default();
        changes.entry_deleted(space.id, updated.scope_id, updated.id);
        changes.apply_with_mutation(&ctx, &mutation).await;

        assert!(
            ctx.space_store
                .list_entry_metadata(space.id, space.scope_id)
                .await
                .expect("failed to list Entries after deletion")
                .is_empty()
        );
        assert!(
            ctx.space_store
                .resolve_entry(space.id, space.scope_id, entry.id)
                .await
                .expect("failed to resolve deleted Entry")
                .is_none()
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_note_metadata_is_resident_and_updates_with_runtime(pool: sqlx::PgPool) {
        let (owner, space, _) = create_space(&pool).await;
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let note = Note::create(
            &mut transaction,
            space.id,
            "Rules".to_string(),
            vec!["rules".to_string()],
            vec!["Reference".to_string()],
            owner.id,
            "Initial content".to_string(),
            Entities::default(),
            AccessPolicy::Public,
            None,
        )
        .await
        .expect("failed to create Note");
        transaction.commit().await.expect("failed to commit Note");

        let ctx = AppContext::new(pool.clone(), None);
        let runtime = ctx
            .space_store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");
        assert_eq!(
            runtime
                .authoritative_snapshot()
                .expect("runtime snapshot is dirty")
                .notes()
                .get(&note.id),
            Some(&note.metadata)
        );
        let initial = ctx
            .space_store
            .resolve_note(space.id, note.id)
            .await
            .expect("failed to resolve initial Note")
            .expect("initial Note is missing");
        assert_eq!(initial.text, "Initial content");

        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire Note mutation");
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let updated = Note::update(
            &mut transaction,
            space.id,
            note.id,
            note.revision,
            "Updated Rules".to_string(),
            vec!["rules".to_string()],
            vec!["Reference".to_string()],
            "Updated content".to_string(),
            Entities::default(),
            AccessPolicy::Public,
            None,
            owner.id,
        )
        .await
        .expect("failed to update Note")
        .expect("Note revision is stale");
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit Note mutation");
        let mut changes = CommittedChanges::default();
        changes.note_updated(&updated.metadata);
        changes.apply_with_mutation(&ctx, &mutation).await;

        let resolved = ctx
            .space_store
            .resolve_note_metadata(space.id, note.id)
            .await
            .expect("failed to resolve Note metadata")
            .expect("Note metadata is missing");
        assert_eq!(resolved.title, "Updated Rules");
        assert_eq!(resolved.revision, 2);
        let full = ctx
            .space_store
            .resolve_note(space.id, note.id)
            .await
            .expect("failed to resolve full Note")
            .expect("full Note is missing");
        assert_eq!(full.text, "Updated content");
        assert!(full.entities.0.is_empty());
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
        assert_eq!(snapshot.settings(), &serde_json::json!({"theme": "dark"}));
        assert!(
            snapshot
                .channel_members()
                .get(&channel.id)
                .is_none_or(|members| !members.contains_key(&former_member.id)),
            "a former member was treated as currently joined"
        );
        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire settings mutation");
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        Space::put_settings(
            &mut *transaction,
            space.id,
            &serde_json::json!({"theme": "light"}),
        )
        .await
        .expect("failed to update Space settings");
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit settings mutation");
        let mut changes = CommittedChanges::default();
        changes.space_settings_updated(space.id, serde_json::json!({"theme": "light"}));
        changes.apply_with_mutation(&ctx, &mutation).await;
        let updated_snapshot = runtime
            .authoritative_snapshot()
            .expect("refreshed runtime snapshot is dirty");
        assert_eq!(
            updated_snapshot.settings(),
            &serde_json::json!({"theme": "light"})
        );
        assert_eq!(snapshot.settings(), &serde_json::json!({"theme": "dark"}));
        assert!(!Arc::ptr_eq(&snapshot.core, &updated_snapshot.core));
        assert!(Arc::ptr_eq(&snapshot.members, &updated_snapshot.members));
        assert!(Arc::ptr_eq(&snapshot.notes, &updated_snapshot.notes));
        assert!(Arc::ptr_eq(&snapshot.scopes, &updated_snapshot.scopes));
        assert!(Arc::ptr_eq(&snapshot.entries, &updated_snapshot.entries));
        let current = runtime.snapshot();
        let ReconciliationResult::Refreshed {
            snapshot: reconciled,
            changed,
        } = SpaceRuntime::reconcile_snapshot(&pool, space.id, current.revision, &current)
            .await
            .expect("failed to reconcile the locally updated settings")
        else {
            panic!("the local settings mutation did not change its database fingerprint");
        };
        assert_eq!(
            changed,
            SnapshotSections {
                core: true,
                ..SnapshotSections::default()
            }
        );
        assert_eq!(
            current.payload_mismatch(&reconciled),
            SnapshotPayloadMismatch::default(),
            "reconciliation disagreed with the locally applied settings delta"
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_reconciliation_skips_reload_when_fingerprint_is_unchanged(pool: sqlx::PgPool) {
        let (_owner, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool);
        let runtime = store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");
        let before = runtime.snapshot();
        let permits = Arc::new(tokio::sync::Semaphore::new(1));
        let permit = permits
            .acquire_owned()
            .await
            .expect("reconciliation semaphore was closed");
        let (_, ack) = runtime
            .enqueue_reconciliation(permit)
            .expect("failed to enqueue reconciliation");

        ack.await
            .expect("reconciliation actor dropped its acknowledgement")
            .expect("reconciliation probe failed");

        let after = runtime.snapshot();
        assert!(
            Arc::ptr_eq(&before, &after),
            "an unchanged database caused the snapshot to be rebuilt"
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_reconciliation_repairs_dirty_runtime_with_unchanged_fingerprint(
        pool: sqlx::PgPool,
    ) {
        let (_owner, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool);
        let runtime = store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");
        let before = runtime.snapshot();

        // Model a failed mutation repair: generation was reserved, but the
        // unchanged database could not be reloaded while it was unavailable.
        let reserved_ticket = runtime.reserve_generation();
        assert!(runtime.authoritative_snapshot().is_none());

        let permits = Arc::new(tokio::sync::Semaphore::new(1));
        let permit = permits
            .acquire_owned()
            .await
            .expect("reconciliation semaphore was closed");
        let (_, ack) = runtime
            .enqueue_reconciliation(permit)
            .expect("failed to enqueue reconciliation");
        ack.await
            .expect("reconciliation actor dropped its acknowledgement")
            .expect("reconciliation repair failed");

        let after = runtime
            .authoritative_snapshot()
            .expect("reconciliation did not restore an authoritative snapshot");
        assert_eq!(after.revision, reserved_ticket);
        assert!(
            !Arc::ptr_eq(&before, &after),
            "a dirty runtime incorrectly took the fingerprint fast path"
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_snapshot_fingerprint_ignores_latest_activity(pool: sqlx::PgPool) {
        let (_owner, space, _) = create_space(&pool).await;
        let before = SpaceRuntime::load_database_fingerprint(&pool, space.id)
            .await
            .expect("failed to load initial fingerprint");

        sqlx::query(
            "UPDATE space_activity SET latest_activity = latest_activity + interval '1 second' WHERE space_id = $1",
        )
        .bind(space.id)
        .execute(&pool)
        .await
        .expect("failed to update latest activity");

        let after = SpaceRuntime::load_database_fingerprint(&pool, space.id)
            .await
            .expect("failed to load updated fingerprint");
        assert_eq!(before, after);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_snapshot_fingerprint_separates_game_state_sections(pool: sqlx::PgPool) {
        let (owner, space, _) = create_space(&pool).await;
        let initial = SpaceRuntime::load_database_fingerprint(&pool, space.id)
            .await
            .expect("failed to load initial fingerprint");

        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        Note::create(
            &mut transaction,
            space.id,
            "Rules".to_string(),
            vec![],
            vec![],
            owner.id,
            "Content".to_string(),
            Entities::default(),
            AccessPolicy::Public,
            None,
        )
        .await
        .expect("failed to create Note");
        transaction.commit().await.expect("failed to commit Note");
        let after_note = SpaceRuntime::load_database_fingerprint(&pool, space.id)
            .await
            .expect("failed to fingerprint Note creation");
        assert_eq!(
            after_note.changed_sections(&initial),
            SnapshotSections {
                notes: true,
                ..SnapshotSections::default()
            }
        );

        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let character = Character::create(
            &mut transaction,
            space.id,
            owner.id,
            "Investigator",
            "investigator",
            vec![],
            "",
            "",
            AccessPolicy::Secret,
            None,
            vec![],
        )
        .await
        .expect("failed to create Character");
        transaction
            .commit()
            .await
            .expect("failed to commit Character");
        let after_character = SpaceRuntime::load_database_fingerprint(&pool, space.id)
            .await
            .expect("failed to fingerprint Character creation");
        assert_eq!(
            after_character.changed_sections(&after_note),
            SnapshotSections {
                scopes: true,
                ..SnapshotSections::default()
            }
        );

        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        Entry::create(
            &mut transaction,
            character.scope_id,
            "hp".to_string(),
            vec![],
            "Hit Points".to_string(),
            None,
            BTreeMap::new(),
            vec![],
            None,
        )
        .await
        .expect("failed to create Entry");
        transaction.commit().await.expect("failed to commit Entry");
        let after_entry = SpaceRuntime::load_database_fingerprint(&pool, space.id)
            .await
            .expect("failed to fingerprint Entry creation");
        assert_eq!(
            after_entry.changed_sections(&after_character),
            SnapshotSections {
                entries: true,
                ..SnapshotSections::default()
            }
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
                .settings(),
            &serde_json::json!({"version": "cached"}),
            "the test write unexpectedly updated process-local state"
        );
        let reloaded = SpaceRuntime::load_snapshot(&pool, space.id, 0)
            .await
            .expect("failed to reload Space snapshot");
        assert_ne!(
            runtime.snapshot().database_fingerprint,
            reloaded.database_fingerprint,
            "an out-of-band settings update did not change the database fingerprint"
        );
        assert_eq!(
            reloaded
                .database_fingerprint
                .changed_sections(&runtime.snapshot().database_fingerprint),
            SnapshotSections {
                core: true,
                ..SnapshotSections::default()
            },
            "a settings update changed unrelated snapshot fingerprint sections"
        );
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
                    && snapshot.settings() == &serde_json::json!({"version": "database"})
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
        let (cold_owner, cold_space, _) = create_space(&pool).await;
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
        assert!(snapshot.channels().contains_key(&initial_channel.id));
        assert!(snapshot.channels().contains_key(&first.id));
        assert!(snapshot.channels().contains_key(&second.id));

        let joined_cold_channel = Channel::create(
            &pool,
            &cold_space.id,
            "Joined cold runtime channel",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to create channel");
        let joined_cold_member = ChannelMember::add_user(
            &pool,
            cold_owner.id,
            joined_cold_channel.id,
            "Cold member",
            false,
        )
        .await
        .expect("failed to add cold Channel member");
        let empty_cold_channel = Channel::create(
            &pool,
            &cold_space.id,
            "Empty cold runtime channel",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to create empty channel");
        ChannelMember::add_user(
            &pool,
            cold_owner.id,
            empty_cold_channel.id,
            "Former cold member",
            false,
        )
        .await
        .expect("failed to add former cold Channel member");
        ChannelMember::remove_user(&pool, cold_owner.id, empty_cold_channel.id)
            .await
            .expect("failed to remove former cold Channel member");

        let mut changes = CommittedChanges::default();
        changes.channel_created(&joined_cold_channel);
        changes.channel_created(&empty_cold_channel);
        changes.channel_member_changed(cold_space.id, &joined_cold_member);
        changes.channel_member_removed(cold_space.id, empty_cold_channel.id, cold_owner.id);
        let mut applied = changes.apply_with_context(&ctx).await;

        assert!(
            ctx.space_store.get(&cold_space.id).is_none(),
            "a committed write unexpectedly loaded a cold runtime"
        );
        let joined_members = applied
            .take_channel_members(cold_space.id, joined_cold_channel.id)
            .expect("joined cold Channel refresh was missing");
        assert_eq!(joined_members.len(), 1);
        assert_eq!(joined_members[0].channel.user_id, cold_owner.id);
        assert!(
            applied
                .take_channel_members(cold_space.id, empty_cold_channel.id)
                .expect("empty cold Channel refresh was missing")
                .is_empty()
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
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let character = Character::create(
            &mut transaction,
            space.id,
            owner.id,
            "Runtime Character",
            "runtime_character",
            vec![],
            "",
            "",
            AccessPolicy::Secret,
            None,
            vec![],
        )
        .await
        .expect("failed to create Character");
        let character_scope = Scope::get_by_id(&mut *transaction, character.scope_id)
            .await
            .expect("failed to load Character Scope")
            .expect("Character Scope is missing");
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit Character creation");
        let mut changes = CommittedChanges::default();
        changes.character_updated(&character);
        changes.scope_updated(&character_scope);
        changes.apply_with_mutation(&ctx, &mutation).await;
        drop(mutation);
        assert_eq!(
            runtime
                .authoritative_snapshot()
                .expect("runtime remained dirty after Character creation")
                .characters()[&character.id]
                .name,
            "Runtime Character"
        );
        assert_eq!(
            runtime
                .authoritative_snapshot()
                .expect("runtime remained dirty after Scope creation")
                .scopes()[&character.scope_id],
            character_scope
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
            .expect("failed to acquire Entry creation mutation");
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let entry = Entry::create(
            &mut transaction,
            character.scope_id,
            "hp".to_string(),
            vec![],
            "Hit Points".to_string(),
            None,
            BTreeMap::from([(
                "core/counter".to_string(),
                crate::entries::models::EntryComponentPayloadInput::json(json!({"value": 10})),
            )]),
            vec![],
            None,
        )
        .await
        .expect("failed to create Character Entry");
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit Entry creation");
        let mut changes = CommittedChanges::default();
        changes.entry_updated(space.id, &entry.metadata);
        changes.apply_with_mutation(&ctx, &mutation).await;
        drop(mutation);
        assert!(
            ctx.space_store
                .resolve_entry(space.id, character.scope_id, entry.id)
                .await
                .expect("failed to resolve Character Entry")
                .is_some()
        );
        let mutation = ctx
            .space_store
            .acquire_mutation(space.id)
            .await
            .expect("failed to acquire Character deletion mutation");
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let deleted_scope_ids = Character::delete(&mut *transaction, &character.id)
            .await
            .expect("failed to delete Character");
        assert_eq!(deleted_scope_ids, vec![character.scope_id]);
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit Character deletion");
        let mut changes = CommittedChanges::default();
        changes.character_deleted(space.id, character.id, deleted_scope_ids);
        changes.apply_with_mutation(&ctx, &mutation).await;
        let snapshot = runtime
            .authoritative_snapshot()
            .expect("runtime remained dirty after Character deletion");
        assert!(!snapshot.characters().contains_key(&character.id));
        assert!(!snapshot.scopes().contains_key(&character.scope_id));
        assert!(!snapshot.entries().contains_key(&character.scope_id));
        assert!(
            ctx.space_store
                .resolve_entry(space.id, character.scope_id, entry.id)
                .await
                .expect("failed to resolve deleted Character Entry")
                .is_none()
        );
    }

    #[sqlx::test]
    async fn db_test_space_mutations_are_serialized_and_guard_eviction(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let space_id = space.id;
        let store = SpaceStore::new(pool);
        let first = store
            .acquire_mutation(space_id)
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
                    .acquire_mutation(space_id)
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
            .refresh_if_loaded(space_id)
            .await
            .expect("failed to await guard refresh");
        tokio::task::yield_now().await;
        assert_eq!(store.evict_idle(Duration::ZERO), 1);
        assert!(store.get(&space_id).is_none());
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
        let space_id = space.id;
        let store = SpaceStore::new(pool);
        drop(
            store
                .get_or_load(space_id)
                .await
                .expect("failed to load Space runtime"),
        );

        let (handle_cloned_tx, handle_cloned_rx) = oneshot::channel();
        let (resume_get_tx, resume_get_rx) = oneshot::channel();
        let get_task = {
            let store = store.clone();
            tokio::spawn(async move {
                store
                    .get_with_hook(&space_id, async move {
                        handle_cloned_tx
                            .send(())
                            .expect("handle clone receiver was dropped");
                        resume_get_rx.await.expect("get resume sender was dropped");
                    })
                    .await
            })
        };
        handle_cloned_rx
            .await
            .expect("get did not clone the Runtime handle");

        let evicted = store.evict_idle(Duration::ZERO);
        resume_get_tx.send(()).expect("paused get task was dropped");
        let fetched = get_task.await.expect("get task panicked");

        assert_eq!(
            evicted, 0,
            "idle eviction removed a handle while get was acquiring its Runtime"
        );
        assert!(fetched.is_some(), "the paused get lost its Runtime");
        assert!(
            store.get(&space_id).is_some(),
            "the fetched Runtime was no longer registered in the Store"
        );
    }

    #[sqlx::test]
    async fn db_test_removed_handle_is_not_returned_by_in_flight_get(pool: sqlx::PgPool) {
        let (_, space, _) = create_space(&pool).await;
        let space_id = space.id;
        let store = SpaceStore::new(pool);
        drop(
            store
                .get_or_load(space_id)
                .await
                .expect("failed to load Space runtime"),
        );

        let (handle_acquired_tx, handle_acquired_rx) = oneshot::channel();
        let (resume_get_tx, resume_get_rx) = oneshot::channel();
        let get_task = {
            let store = store.clone();
            tokio::spawn(async move {
                store
                    .get_with_hook(&space_id, async move {
                        handle_acquired_tx
                            .send(())
                            .expect("handle acquire receiver was dropped");
                        resume_get_rx.await.expect("get resume sender was dropped");
                    })
                    .await
            })
        };
        handle_acquired_rx
            .await
            .expect("get did not acquire the Runtime handle");

        store.remove(space_id);
        resume_get_tx.send(()).expect("paused get task was dropped");
        let fetched = get_task.await.expect("get task panicked");

        assert!(
            fetched.is_none(),
            "an in-flight get returned a Runtime after its handle was removed"
        );
        assert!(store.get(&space_id).is_none());
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
    async fn db_test_mutation_only_blocks_strict_reads_after_commit_is_prepared(
        pool: sqlx::PgPool,
    ) {
        let (_, space, _) = create_space(&pool).await;
        let store = SpaceStore::new(pool.clone());
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
            runtime.authoritative_snapshot().is_some(),
            "opening a mutation made the snapshot non-authoritative before commit"
        );

        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        Space::put_settings(
            &mut *transaction,
            space.id,
            &serde_json::json!({"version": "published"}),
        )
        .await
        .expect("failed to update Space settings");
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit mutation");
        assert!(
            runtime.authoritative_snapshot().is_none(),
            "snapshot remained authoritative after the mutation committed"
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
            snapshot.settings(),
            &serde_json::json!({"version": "published"})
        );
        drop(mutation);
    }

    #[sqlx::test]
    async fn db_test_refresh_does_not_deadlock_mutation_commit_with_single_connection(
        pool: sqlx::PgPool,
    ) {
        let (_, space, _) = create_space(&pool).await;
        let single_connection_pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(Duration::from_secs(5))
            .connect_with(pool.connect_options().as_ref().clone())
            .await
            .expect("failed to create single-connection pool");
        let store = SpaceStore::new(single_connection_pool.clone());
        let runtime = store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");
        let mutation = runtime
            .acquire_mutation()
            .await
            .expect("failed to acquire mutation");
        let mut transaction = single_connection_pool
            .begin()
            .await
            .expect("failed to begin transaction");
        Space::put_settings(
            &mut *transaction,
            space.id,
            &serde_json::json!({"version": "committed"}),
        )
        .await
        .expect("failed to update Space settings");

        let (_ticket, refresh_ack) = runtime
            .enqueue_refresh(SnapshotReloadReason::Unguarded, None)
            .expect("failed to enqueue refresh");
        tokio::task::yield_now().await;

        let mutation = tokio::time::timeout(Duration::from_secs(2), mutation.commit(transaction))
            .await
            .expect("mutation commit deadlocked behind a refresh waiting for its DB connection")
            .expect("failed to commit mutation");
        runtime
            .apply_committed_deltas(
                mutation.proof().mutation_token,
                vec![SpaceDelta::SettingsUpdated(
                    serde_json::json!({"version": "committed"}),
                )],
            )
            .await
            .expect("failed to publish mutation delta");
        drop(mutation);
        tokio::time::timeout(Duration::from_secs(2), refresh_ack)
            .await
            .expect("deferred refresh did not finish")
            .expect("refresh actor dropped its acknowledgement")
            .expect("deferred refresh failed");
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
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let channel = Channel::create(
            &mut *transaction,
            &space.id,
            "Committed before cancellation",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to commit channel");
        let mutation = guard
            .commit(transaction)
            .await
            .expect("failed to commit mutation");

        // Simulate cancellation after commit but before CommittedChanges::apply.
        drop(mutation);
        assert!(
            runtime.authoritative_snapshot().is_none(),
            "the pre-commit snapshot stayed authoritative after a cancelled mutation"
        );
        tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                if let Some(snapshot) = runtime.authoritative_snapshot()
                    && snapshot.channels().contains_key(&channel.id)
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
        let unguarded_apply = {
            let ctx = ctx.clone();
            tokio::spawn(async move { unguarded_changes.apply_with_context(&ctx).await })
        };
        tokio::task::yield_now().await;

        let mut transaction = pool
            .begin()
            .await
            .expect("failed to begin guarded transaction");
        let cancelled_channel = Channel::create(
            &mut *transaction,
            &space.id,
            "Committed before cancellation",
            true,
            Some("d20"),
            ChannelType::OutOfGame,
        )
        .await
        .expect("failed to commit guarded channel");
        let mutation = mutation
            .commit(transaction)
            .await
            .expect("failed to commit guarded mutation");

        // The unguarded publication must not count as this mutation's publication.
        drop(mutation);
        tokio::time::timeout(Duration::from_secs(1), unguarded_apply)
            .await
            .expect("unguarded refresh remained deferred after mutation completion")
            .expect("unguarded refresh task failed");
        tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                if let Some(snapshot) = runtime.authoritative_snapshot()
                    && snapshot.channels().contains_key(&unguarded_channel.id)
                    && snapshot.channels().contains_key(&cancelled_channel.id)
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
