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

pub fn find_intermediate(p1: i32, q1: i32, p2: i32, q2: i32) -> (i32, i32) {
    if (p1 as i64 * q2 as i64) == (p2 as i64 * q1 as i64) {
        return (p1, q1);
    }
    let (mut low, mut high) = ((0, 1), (1, 0));
    if (p1 as i64 * q2 as i64 + 1) != (p2 as i64 * q1 as i64) {
        loop {
            let x = (low.0 + high.0, low.1 + high.1);
            if x.0 as i64 * q1 as i64 <= x.1 as i64 * p1 as i64 {
                low = x;
            } else if p2 as i64 * x.1 as i64 <= q2 as i64 * x.0 as i64 {
                high = x;
            } else {
                return x;
            }
        }
    }
    (p1 + p2, q1 + q2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_neighbors_1_3_1_2() {
        assert_eq!(find_intermediate(1, 3, 1, 2), (2, 5));
    }

    #[test]
    fn test_neighbors_1_2_2_3() {
        assert_eq!(find_intermediate(1, 2, 2, 3), (3, 5));
    }

    #[test]
    fn test_non_neighbors_1_4_1_2() {
        assert_eq!(find_intermediate(1, 4, 1, 2), (1, 3));
    }

    #[test]
    fn test_non_neighbors_1_3_2_3() {
        assert_eq!(find_intermediate(1, 3, 2, 3), (1, 2));
    }

    #[test]
    fn test_neighbors_2_3_3_4() {
        assert_eq!(find_intermediate(2, 3, 3, 4), (5, 7));
    }

    #[test]
    fn test_edge_0_1_1_1() {
        assert_eq!(find_intermediate(0, 1, 1, 1), (1, 2));
    }

    #[test]
    fn test_far_apart_1_100_1_1() {
        assert_eq!(find_intermediate(1, 100, 1, 1), (1, 2));
    }

    #[test]
    fn test_equal_fractions_1_2_1_2() {
        assert_eq!(find_intermediate(1, 2, 1, 2), (1, 2));
    }
}
