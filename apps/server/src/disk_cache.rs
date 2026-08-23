use crate::events::EventId;
use redb::{Database, Durability, ReadableDatabase, TableDefinition};
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::mpsc::{Receiver, SyncSender, TrySendError};
use std::time::{Duration, Instant};
use tokio::sync::oneshot;
use tokio_tungstenite::tungstenite::Utf8Bytes;
use uuid::Uuid;

const MAILBOX_UPDATES: TableDefinition<&[u8], &[u8]> = TableDefinition::new("mailbox_updates_v1");
const COMMAND_QUEUE_CAPACITY: usize = 256;
const MAX_BATCH_OPERATIONS: usize = 256;
const MAX_BATCH_BYTES: usize = 1024 * 1024;
const BATCH_INTERVAL: Duration = Duration::from_millis(10);
const READ_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Debug)]
pub(crate) struct MailboxMutationBatch {
    pub mailbox_id: Uuid,
    pub puts: Vec<(EventId, Utf8Bytes)>,
    pub deletes: Vec<EventId>,
}

impl MailboxMutationBatch {
    fn operations(&self) -> usize {
        self.puts.len() + self.deletes.len()
    }

    fn bytes(&self) -> usize {
        self.puts.iter().map(|(_, encoded)| encoded.len()).sum()
    }
}

enum Command {
    WriteMailbox(MailboxMutationBatch),
    ReadMailbox {
        mailbox_id: Uuid,
        event_ids: Vec<EventId>,
        respond_to: oneshot::Sender<Result<Vec<(EventId, Utf8Bytes)>, CacheError>>,
    },
    Shutdown {
        respond_to: oneshot::Sender<()>,
    },
}

#[derive(Debug, Clone, thiserror::Error)]
pub(super) enum CacheError {
    #[error("disk cache is disabled")]
    Disabled,
    #[error("disk cache queue is full")]
    QueueFull,
    #[error("disk cache reached its write high-water mark")]
    Capacity,
    #[error("disk cache worker stopped")]
    Closed,
    #[error("disk cache operation timed out")]
    Timeout,
    #[error("disk cache failed: {0}")]
    Storage(String),
}

struct DiskCache {
    sender: SyncSender<Command>,
    healthy: AtomicBool,
    accepting_writes: AtomicBool,
    pending_commands: AtomicUsize,
}

impl DiskCache {
    fn start(config: Config) -> Result<Self, CacheError> {
        if let Some(parent) = config.path.parent() {
            std::fs::create_dir_all(parent).map_err(storage_error)?;
        }
        // In-memory cache indexes are rebuilt by the process, so payloads left
        // by an earlier process cannot be addressed safely.
        match std::fs::remove_file(&config.path) {
            Ok(()) => {}
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {}
            Err(err) => return Err(storage_error(err)),
        }

        let database = create_database(&config)?;

        let (sender, receiver) = std::sync::mpsc::sync_channel(COMMAND_QUEUE_CAPACITY);
        let worker_path = config.path.clone();
        let worker_cache_size = config.cache_size;
        let worker_max_file_size = config.max_file_size;
        std::thread::Builder::new()
            .name("redb-disk-cache".to_owned())
            .spawn(move || run_worker(receiver, config, database))
            .map_err(storage_error)?;
        tracing::info!(
            path = %worker_path.display(),
            cache_size = worker_cache_size,
            max_file_size = worker_max_file_size,
            "redb disk cache started"
        );
        Ok(Self {
            sender,
            healthy: AtomicBool::new(true),
            accepting_writes: AtomicBool::new(true),
            pending_commands: AtomicUsize::new(0),
        })
    }

    fn send(&self, command: Command) -> Result<(), CacheError> {
        if !self.healthy.load(Ordering::Relaxed) {
            return Err(CacheError::Closed);
        }
        if matches!(&command, Command::WriteMailbox(_))
            && !self.accepting_writes.load(Ordering::Relaxed)
        {
            metrics::counter!("boluo_server_disk_cache_capacity_rejections_total").increment(1);
            return Err(CacheError::Capacity);
        }
        self.pending_commands.fetch_add(1, Ordering::Relaxed);
        match self.sender.try_send(command) {
            Ok(()) => Ok(()),
            Err(TrySendError::Full(_)) => {
                self.pending_commands.fetch_sub(1, Ordering::Relaxed);
                metrics::counter!("boluo_server_disk_cache_queue_full_total").increment(1);
                Err(CacheError::QueueFull)
            }
            Err(TrySendError::Disconnected(_)) => {
                self.pending_commands.fetch_sub(1, Ordering::Relaxed);
                self.healthy.store(false, Ordering::Relaxed);
                Err(CacheError::Closed)
            }
        }
    }
}

#[derive(Clone)]
pub(crate) struct Config {
    pub(crate) path: PathBuf,
    pub(crate) cache_size: usize,
    pub(crate) max_file_size: u64,
}

static CACHE: OnceLock<Option<DiskCache>> = OnceLock::new();

pub(super) fn init(config: Option<Config>) {
    CACHE.get_or_init(|| {
        let Some(config) = config else {
            metrics::gauge!("boluo_server_disk_cache_up").set(0.0);
            tracing::info!("redb disk cache disabled by configuration");
            return None;
        };
        match DiskCache::start(config) {
            Ok(cache) => Some(cache),
            Err(err) => {
                metrics::gauge!("boluo_server_disk_cache_up").set(0.0);
                tracing::error!(
                    event = "disk_cache.start_failed", error = %err, "Failed to start redb disk cache; using memory");
                None
            }
        }
    });
}

pub(crate) fn try_mutate_mailbox(mutation: MailboxMutationBatch) -> Result<(), CacheError> {
    let Some(cache) = CACHE.get().and_then(Option::as_ref) else {
        return Err(CacheError::Disabled);
    };
    cache.send(Command::WriteMailbox(mutation))
}

pub(crate) async fn read_mailbox(
    mailbox_id: Uuid,
    event_ids: Vec<EventId>,
) -> Result<Vec<(EventId, Utf8Bytes)>, CacheError> {
    let Some(cache) = CACHE.get().and_then(Option::as_ref) else {
        return Err(CacheError::Disabled);
    };
    let (respond_to, response) = oneshot::channel();
    cache.send(Command::ReadMailbox {
        mailbox_id,
        event_ids,
        respond_to,
    })?;
    tokio::time::timeout(READ_TIMEOUT, response)
        .await
        .map_err(|_| CacheError::Timeout)?
        .map_err(|_| CacheError::Closed)?
}

pub(super) async fn shutdown() {
    let Some(cache) = CACHE.get().and_then(Option::as_ref) else {
        return;
    };
    let (respond_to, response) = oneshot::channel();
    if cache.send(Command::Shutdown { respond_to }).is_err() {
        return;
    }
    if tokio::time::timeout(READ_TIMEOUT, response).await.is_err() {
        tracing::warn!(
            event = "disk_cache.shutdown_timeout",
            "Timed out while shutting down redb disk cache"
        );
    }
}

fn create_database(config: &Config) -> Result<Database, CacheError> {
    let mut builder = redb::Builder::new();
    builder.set_cache_size(config.cache_size);
    let database = builder.create(&config.path).map_err(storage_error)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&config.path, std::fs::Permissions::from_mode(0o600))
            .map_err(storage_error)?;
    }
    let write = database.begin_write().map_err(storage_error)?;
    {
        write.open_table(MAILBOX_UPDATES).map_err(storage_error)?;
    }
    write.commit().map_err(storage_error)?;
    Ok(database)
}

fn run_worker(receiver: Receiver<Command>, config: Config, database: Database) {
    if let Err(err) = run_worker_inner(&receiver, &config, database) {
        tracing::error!(
            event = "disk_cache.worker_failed", error = %err, "redb disk cache worker failed");
        mark_unhealthy();
        metrics::gauge!("boluo_server_disk_cache_up").set(0.0);
    }
}

fn run_worker_inner(
    receiver: &Receiver<Command>,
    config: &Config,
    mut database: Database,
) -> Result<(), CacheError> {
    metrics::gauge!("boluo_server_disk_cache_up").set(1.0);
    metrics::gauge!("boluo_server_disk_cache_max_file_bytes").set(config.max_file_size as f64);
    metrics::gauge!("boluo_server_disk_cache_high_watermark_bytes")
        .set(config.max_file_size.saturating_mul(9) as f64 / 10.0);

    let mut pending = Vec::new();
    loop {
        let command = match receiver.recv() {
            Ok(command) => command,
            Err(_) => {
                flush_mutations(&database, &mut pending)?;
                break;
            }
        };
        decrement_queue_depth();
        match command {
            Command::WriteMailbox(mutation) => {
                let mut operation_count = mutation.operations();
                let mut byte_count = mutation.bytes();
                pending.push(mutation);
                let deadline = Instant::now() + BATCH_INTERVAL;
                loop {
                    if operation_count >= MAX_BATCH_OPERATIONS || byte_count >= MAX_BATCH_BYTES {
                        break;
                    }
                    let remaining = deadline.saturating_duration_since(Instant::now());
                    if remaining.is_zero() {
                        break;
                    }
                    match receiver.recv_timeout(remaining) {
                        Ok(Command::WriteMailbox(mutation)) => {
                            decrement_queue_depth();
                            operation_count += mutation.operations();
                            byte_count += mutation.bytes();
                            pending.push(mutation);
                        }
                        Ok(command) => {
                            decrement_queue_depth();
                            flush_mutations(&database, &mut pending)?;
                            if handle_barrier(command, &database)? {
                                return Ok(());
                            }
                            break;
                        }
                        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => break,
                        Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                            flush_mutations(&database, &mut pending)?;
                            return Ok(());
                        }
                    }
                }
                if !pending.is_empty() {
                    flush_mutations(&database, &mut pending)?;
                }
                maybe_compact(&mut database, config)?;
            }
            command => {
                if handle_barrier(command, &database)? {
                    break;
                }
            }
        }
        record_database_metrics(&database, &config.path);
    }
    metrics::gauge!("boluo_server_disk_cache_up").set(0.0);
    Ok(())
}

fn handle_barrier(command: Command, database: &Database) -> Result<bool, CacheError> {
    match command {
        Command::WriteMailbox(_) => unreachable!("mailbox writes are handled by the batch loop"),
        Command::ReadMailbox {
            mailbox_id,
            event_ids,
            respond_to,
        } => {
            let result = read_values(database, mailbox_id, &event_ids);
            let _ = respond_to.send(result);
            Ok(false)
        }
        Command::Shutdown { respond_to } => {
            let _ = respond_to.send(());
            Ok(true)
        }
    }
}

fn flush_mutations(
    database: &Database,
    mutations: &mut Vec<MailboxMutationBatch>,
) -> Result<(), CacheError> {
    if mutations.is_empty() {
        return Ok(());
    }
    let start = Instant::now();
    let operation_count: usize = mutations.iter().map(MailboxMutationBatch::operations).sum();
    let byte_count: usize = mutations.iter().map(MailboxMutationBatch::bytes).sum();
    let mut write = database.begin_write().map_err(storage_error)?;
    write
        .set_durability(Durability::None)
        .map_err(storage_error)?;
    {
        let mut mailbox_table = write.open_table(MAILBOX_UPDATES).map_err(storage_error)?;
        for mutation in mutations.drain(..) {
            for event_id in mutation.deletes {
                mailbox_table
                    .remove(mailbox_key(mutation.mailbox_id, event_id).as_slice())
                    .map_err(storage_error)?;
            }
            for (event_id, encoded) in mutation.puts {
                mailbox_table
                    .insert(
                        mailbox_key(mutation.mailbox_id, event_id).as_slice(),
                        encoded.as_bytes(),
                    )
                    .map_err(storage_error)?;
            }
        }
    }
    write.commit().map_err(storage_error)?;
    metrics::counter!("boluo_server_disk_cache_write_operations_total")
        .increment(operation_count as u64);
    metrics::counter!("boluo_server_disk_cache_logical_write_bytes_total")
        .increment(byte_count as u64);
    metrics::histogram!("boluo_server_disk_cache_batch_operations").record(operation_count as f64);
    metrics::histogram!("boluo_server_disk_cache_commit_duration_ms")
        .record(start.elapsed().as_secs_f64() * 1000.0);
    Ok(())
}

fn maybe_compact(database: &mut Database, config: &Config) -> Result<(), CacheError> {
    let high_watermark = config.max_file_size.saturating_mul(9) / 10;
    if file_size(&config.path) < high_watermark {
        return Ok(());
    }

    metrics::counter!("boluo_server_disk_cache_compaction_attempts_total").increment(1);
    let start = Instant::now();
    let compacted = database.compact().map_err(storage_error)?;
    metrics::histogram!("boluo_server_disk_cache_compaction_duration_ms")
        .record(start.elapsed().as_secs_f64() * 1000.0);

    let file_bytes = file_size(&config.path);
    metrics::gauge!("boluo_server_disk_cache_file_bytes").set(file_bytes as f64);
    if compacted {
        metrics::counter!("boluo_server_disk_cache_compactions_total").increment(1);
        tracing::info!(file_bytes, "Compacted redb disk cache");
    }
    if file_bytes >= high_watermark {
        stop_accepting_writes();
    }
    Ok(())
}

fn read_values(
    database: &Database,
    mailbox_id: Uuid,
    event_ids: &[EventId],
) -> Result<Vec<(EventId, Utf8Bytes)>, CacheError> {
    let start = Instant::now();
    let read = database.begin_read().map_err(storage_error)?;
    let table = read.open_table(MAILBOX_UPDATES).map_err(storage_error)?;
    let mut values = Vec::with_capacity(event_ids.len());
    for event_id in event_ids {
        let Some(value) = table
            .get(mailbox_key(mailbox_id, *event_id).as_slice())
            .map_err(storage_error)?
        else {
            return Err(CacheError::Storage(format!(
                "payload for event {event_id:?} is missing"
            )));
        };
        let encoded: Utf8Bytes = std::str::from_utf8(value.value())
            .map_err(storage_error)?
            .to_owned()
            .into();
        values.push((*event_id, encoded));
    }
    metrics::counter!("boluo_server_mailbox_cache_read_operations_total")
        .increment(event_ids.len() as u64);
    let payload_bytes = values
        .iter()
        .map(|(_, encoded)| encoded.len() as u64)
        .sum::<u64>();
    metrics::histogram!("boluo_server_mailbox_cache_read_payload_bytes")
        .record(payload_bytes as f64);
    metrics::histogram!("boluo_server_mailbox_cache_read_duration_ms")
        .record(start.elapsed().as_secs_f64() * 1000.0);
    Ok(values)
}

fn mailbox_key(mailbox_id: Uuid, event_id: EventId) -> [u8; 30] {
    let mut key = [0_u8; 30];
    key[..16].copy_from_slice(mailbox_id.as_bytes());
    let ordered_timestamp = (event_id.timestamp as u64) ^ (1_u64 << 63);
    key[16..24].copy_from_slice(&ordered_timestamp.to_be_bytes());
    key[24..26].copy_from_slice(&event_id.node.to_be_bytes());
    key[26..30].copy_from_slice(&event_id.seq.to_be_bytes());
    key
}

fn record_database_metrics(database: &Database, path: &Path) {
    let stats = database.cache_stats();
    metrics::gauge!("boluo_server_disk_cache_memory_bytes").set(stats.used_bytes() as f64);
    metrics::counter!("boluo_server_disk_cache_read_hits").absolute(stats.read_hits());
    metrics::counter!("boluo_server_disk_cache_read_misses").absolute(stats.read_misses());
    metrics::counter!("boluo_server_disk_cache_write_hits").absolute(stats.write_hits());
    metrics::counter!("boluo_server_disk_cache_write_misses").absolute(stats.write_misses());
    metrics::gauge!("boluo_server_disk_cache_file_bytes").set(file_size(path) as f64);
    metrics::gauge!("boluo_server_disk_cache_queue_depth").set(queue_depth() as f64);
}

fn file_size(path: &Path) -> u64 {
    std::fs::metadata(path)
        .map(|metadata| metadata.len())
        .unwrap_or(0)
}

fn decrement_queue_depth() {
    if let Some(cache) = CACHE.get().and_then(Option::as_ref) {
        cache.pending_commands.fetch_sub(1, Ordering::Relaxed);
    }
}

fn queue_depth() -> usize {
    CACHE
        .get()
        .and_then(Option::as_ref)
        .map(|cache| cache.pending_commands.load(Ordering::Relaxed))
        .unwrap_or(0)
}

fn stop_accepting_writes() {
    if let Some(cache) = CACHE.get().and_then(Option::as_ref)
        && cache.accepting_writes.swap(false, Ordering::Relaxed)
    {
        metrics::counter!("boluo_server_disk_cache_high_watermark_total").increment(1);
        tracing::warn!(
            event = "disk_cache.write_high_water_mark",
            "redb disk cache reached its write high-water mark; keeping new payloads in memory"
        );
    }
}

fn mark_unhealthy() {
    if let Some(cache) = CACHE.get().and_then(Option::as_ref) {
        cache.healthy.store(false, Ordering::Release);
        cache.accepting_writes.store(false, Ordering::Release);
    }
}

fn storage_error(error: impl std::fmt::Display) -> CacheError {
    CacheError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_preserve_event_order() {
        let mailbox_id = Uuid::new_v4();
        let ids = [
            EventId {
                timestamp: -1,
                node: 1,
                seq: 2,
            },
            EventId {
                timestamp: 0,
                node: 1,
                seq: 2,
            },
            EventId {
                timestamp: 1,
                node: 0,
                seq: 9,
            },
            EventId {
                timestamp: 1,
                node: 1,
                seq: 0,
            },
        ];
        assert!(ids.windows(2).all(|ids| {
            mailbox_key(mailbox_id, ids[0]).as_slice() < mailbox_key(mailbox_id, ids[1]).as_slice()
        }));
    }

    #[test]
    fn writes_reads_and_deletes_payloads() {
        let path = std::env::temp_dir().join(format!("boluo-cache-test-{}.redb", Uuid::new_v4()));
        let config = Config {
            path: path.clone(),
            cache_size: 1024 * 1024,
            max_file_size: 16 * 1024 * 1024,
        };
        let database = create_database(&config).expect("create test cache");
        let mailbox_id = Uuid::new_v4();
        let event_id = EventId {
            timestamp: 42,
            node: 7,
            seq: 9,
        };
        let mut mutations = vec![MailboxMutationBatch {
            mailbox_id,
            puts: vec![(event_id, Utf8Bytes::from_static("{\"ok\":true}"))],
            deletes: Vec::new(),
        }];

        flush_mutations(&database, &mut mutations).expect("write payload");
        let values = read_values(&database, mailbox_id, &[event_id]).expect("read payload");
        assert_eq!(values, vec![(event_id, "{\"ok\":true}".into())]);

        mutations.push(MailboxMutationBatch {
            mailbox_id,
            puts: Vec::new(),
            deletes: vec![event_id],
        });
        flush_mutations(&database, &mut mutations).expect("delete payload");
        let missing = read_values(&database, mailbox_id, &[event_id]);
        assert!(missing.is_err());

        drop(database);
        std::fs::remove_file(path).expect("remove test cache");
    }
}
