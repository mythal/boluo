use std::sync::{
    atomic::{AtomicI32, Ordering},
    LazyLock,
};

use crate::error::ValidationFailed;
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

static CHANNEL_MAX_POS: LazyLock<papaya::HashMap<Uuid, AtomicI32, ahash::RandomState>> =
    LazyLock::new(|| {
        papaya::HashMap::builder()
            .capacity(1024)
            .hasher(ahash::RandomState::new())
            .build()
    });

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PosItemState {
    Submitted,
    Cancelled,
    Keeping,
}

#[derive(Debug, Clone)]
struct PosItem {
    pos: i32,
    state: PosItemState,
    created: std::time::Instant,
    updated: std::time::Instant,
}

impl PosItem {
    fn new(pos: i32) -> Self {
        let now = std::time::Instant::now();
        Self {
            pos,
            created: now,
            updated: now,
            state: PosItemState::Keeping,
        }
    }

    fn is_vaild(&self, keep_seconds: u64) -> bool {
        self.state == PosItemState::Keeping && self.created.elapsed().as_secs() < keep_seconds
    }
}

// FIXME: The outdated values are never removed.
static CHANNEL_ITEM_POS: LazyLock<papaya::HashMap<(Uuid, Uuid), PosItem, ahash::RandomState>> =
    LazyLock::new(|| {
        papaya::HashMap::builder()
            .capacity(4096)
            .hasher(ahash::RandomState::new())
            .build()
    });

pub fn update_max_pos(channel_id: Uuid, pos: i32) -> i32 {
    let max_pos_map = CHANNEL_MAX_POS.pin();
    let max_pos = max_pos_map.get_or_insert_with(channel_id, || AtomicI32::new(1));
    let old_pos = max_pos.fetch_max(pos, Ordering::SeqCst);
    std::cmp::max(old_pos, pos)
}

pub async fn allocate_next_pos(
    db: &mut sqlx::PgConnection,
    channel_id: Uuid,
) -> Result<i32, sqlx::Error> {
    const DELTA: i32 = 1;
    let in_cache_pos: Option<i32> = {
        let max_pos_map = CHANNEL_MAX_POS.pin();
        max_pos_map
            .get(&channel_id)
            .map(|pos| pos.load(Ordering::SeqCst))
    };

    let old_value = if let Some(in_cache_pos) = in_cache_pos {
        let max_pos_map = CHANNEL_MAX_POS.pin();
        max_pos_map
            .get_or_insert_with(channel_id, || AtomicI32::new(in_cache_pos))
            .fetch_add(DELTA, Ordering::SeqCst)
    } else {
        // if not present, initialize it
        let (p, q) = crate::messages::Message::max_pos(db, &channel_id).await?;
        let initial_pos = (p as f64 / q as f64).ceil() as i32;
        let max_pos_map = CHANNEL_MAX_POS.pin();
        max_pos_map
            .get_or_insert(channel_id, AtomicI32::new(initial_pos))
            .fetch_add(DELTA, Ordering::SeqCst)
    };
    Ok(old_value.wrapping_add(DELTA))
}

pub async fn pos(
    db: &mut sqlx::PgConnection,
    channel_id: Uuid,
    item_id: Uuid,
    keep_seconds: u64,
) -> Result<i32, sqlx::Error> {
    {
        let item_pos_map = CHANNEL_ITEM_POS.pin();
        if let Some(pos_item) = item_pos_map.get(&(channel_id, item_id)) {
            if pos_item.is_vaild(keep_seconds) {
                return Ok(pos_item.pos);
            }
        }
    }
    let pos = allocate_next_pos(db, channel_id).await?;
    let item_pos_map = CHANNEL_ITEM_POS.pin();
    item_pos_map.insert((channel_id, item_id), PosItem::new(pos));
    Ok(pos)
}

pub fn reset_channel_pos(channel_id: &Uuid) {
    {
        let mut item_pos_map = CHANNEL_ITEM_POS.pin();
        item_pos_map.retain(|(item_channel_id, _), _| item_channel_id != channel_id);
    }
    let max_pos_map = CHANNEL_MAX_POS.pin();
    max_pos_map.remove(channel_id);
}

pub fn submitted(channel_id: Uuid, item_id: Uuid) -> Option<i32> {
    let item_pos_map = CHANNEL_ITEM_POS.pin();
    item_pos_map
        .update((channel_id, item_id), |pos_item| {
            let mut pos_item = pos_item.clone();
            pos_item.state = PosItemState::Submitted;
            pos_item.updated = std::time::Instant::now();
            pos_item
        })
        .map(|pos_item| pos_item.pos)
}

pub fn cancel(channel_id: Uuid, item_id: Uuid) -> Option<i32> {
    let item_pos_map = CHANNEL_ITEM_POS.pin();
    item_pos_map
        .update((channel_id, item_id), |pos_item| {
            let mut pos_item = pos_item.clone();
            pos_item.state = PosItemState::Cancelled;
            pos_item.updated = std::time::Instant::now();
            pos_item
        })
        .map(|pos_item| pos_item.pos)
}
