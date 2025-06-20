use std::{collections::BTreeMap, sync::LazyLock, time::Instant};

use crate::error::ValidationFailed;
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

pub struct ChannelPosMap(
    pub  papaya::HashMap<
        Uuid,
        parking_lot::RwLock<BTreeMap<Rational32, PosItem>>,
        ahash::RandomState,
    >,
);

impl ChannelPosMap {
    pub fn new() -> ChannelPosMap {
        ChannelPosMap(
            papaya::HashMap::builder()
                .capacity(1024)
                .hasher(ahash::RandomState::new())
                .build(),
        )
    }

    pub fn reset(&self, channel_id: Uuid) {
        let channel_pos_map = self.0.pin();
        channel_pos_map.remove(&channel_id);
    }
}

impl ChannelPosMap {
    pub fn try_restore_pos(&self, channel_id: Uuid, item_id: Uuid) -> Option<Rational32> {
        let channel_pos_map = self.0.pin();
        if let Some(channel_pos) = channel_pos_map.get(&channel_id) {
            let channel_pos = channel_pos.read();
            let now = Instant::now();
            if let Some((pos, pos_item)) = channel_pos
                .iter()
                .rev()
                .find(|(_, pos_item)| pos_item.id == item_id)
            {
                if pos_item.is_live(now) {
                    return Some(*pos);
                }
            }
        }
        None
    }

    pub async fn get_next_pos(
        &self,
        db: &mut sqlx::PgConnection,
        channel_id: Uuid,
    ) -> Result<i32, sqlx::Error> {
        {
            let channel_pos_map = self.0.pin();
            let channel_pos_lock = channel_pos_map.get_or_insert_with(channel_id, Default::default);
            let channel_pos = channel_pos_lock.read();
            let last_key = channel_pos.last_key_value().map(|(k, _)| *k);
            if let Some(last_key) = last_key {
                return Ok(last_key.ceil().numer() + 1);
            }
        };
        let max_pos_result = crate::messages::Message::max_pos(db, &channel_id).await;

        let channel_pos_map = self.0.pin();
        let mut channel_pos = channel_pos_map
            .get_or_insert_with(channel_id, Default::default)
            .write();
        if let Some((key, _)) = channel_pos.last_key_value() {
            Ok(key.ceil().numer() + 1)
        } else {
            let (p, q, id) = match max_pos_result {
                Ok((p, q, id)) => (p, q, id),
                Err(sqlx::Error::RowNotFound) => (42, 1, Uuid::nil()),
                Err(e) => return Err(e),
            };
            let pos = Rational32::new(p, q);
            channel_pos.insert(pos, PosItem::submitted(id));
            Ok(pos.ceil().numer() + 1)
        }
    }

    pub async fn preview_pos(
        &self,
        db: &mut sqlx::PgConnection,
        channel_id: Uuid,
        item_id: Uuid,
        timeout: u32,
    ) -> Result<Rational32, sqlx::Error> {
        if let Some(pos) = self.try_restore_pos(channel_id, item_id) {
            return Ok(pos);
        }
        let next_pos = self.get_next_pos(db, channel_id).await?;
        let pos_item = PosItem::new(item_id, timeout);
        let channel_pos_map = self.0.pin();
        let channel_pos_lock = channel_pos_map.get_or_insert_with(channel_id, Default::default);
        let mut channel_pos = channel_pos_lock.write();
        channel_pos.insert(Rational32::new(next_pos, 1), pos_item);
        Ok(Rational32::new(next_pos, 1))
    }

    pub fn submitted(
        &self,
        channel_id: Uuid,
        item_id: Uuid,
        pos_p: i32,
        pos_q: i32,
        old_item_id: Option<Uuid>,
    ) {
        let channel_pos_map = self.0.pin();
        let channel_pos_lock = channel_pos_map.get_or_insert_with(channel_id, Default::default);
        let mut channel_pos = channel_pos_lock.write();
        let old_value =
            channel_pos.insert(Rational32::new(pos_p, pos_q), PosItem::submitted(item_id));
        if let Some(old_item_id) = old_item_id {
            if let Some(old_value) = old_value {
                if old_value.id == old_item_id {
                    return;
                }
            }
            let now = std::time::Instant::now();
            channel_pos
                .retain(|_, pos_item| pos_item.id != old_item_id && !pos_item.should_delete(now));
        }
    }

    pub fn cancel(&self, channel_id: Uuid, item_id: Uuid) {
        let now = std::time::Instant::now();
        let channel_pos_map = self.0.pin();
        let channel_pos_lock = channel_pos_map.get_or_insert_with(channel_id, Default::default);
        let mut channel_pos = channel_pos_lock.write();
        channel_pos.retain(|_, pos_item| pos_item.id != item_id && !pos_item.should_delete(now));
    }
}

pub static CHANNEL_POS_MAP: LazyLock<ChannelPosMap> = LazyLock::new(ChannelPosMap::new);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PosItemState {
    Submitted,
    Cancelled,
    LiveIn(u32),
}

#[derive(Debug, Clone)]
pub struct PosItem {
    pub id: Uuid,
    pub state: PosItemState,
    created: std::time::Instant,
}

impl PosItem {
    fn new(id: Uuid, timeout: u32) -> Self {
        let now = std::time::Instant::now();
        Self {
            id,
            created: now,
            state: PosItemState::LiveIn(timeout),
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

    pub fn is_live(&self, now: Instant) -> bool {
        match self.state {
            PosItemState::Submitted => false,
            PosItemState::Cancelled => false,
            PosItemState::LiveIn(timeout) => (now - self.created).as_secs() < timeout as u64,
        }
    }

    pub fn pos_available(&self, now: Instant) -> bool {
        match self.state {
            PosItemState::Submitted => false,
            PosItemState::Cancelled => true,
            PosItemState::LiveIn(timeout) => (now - self.created).as_secs() >= timeout as u64,
        }
    }

    pub fn should_delete(&self, now: Instant) -> bool {
        self.state == PosItemState::Cancelled || (now - self.created).as_secs() >= 60 * 5
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FailToFindIntermediate {
    EqualFractions,
    OutOfRange,
}

pub fn find_intermediate(
    p1: i32,
    q1: i32,
    p2: i32,
    q2: i32,
) -> Result<(i32, i32), FailToFindIntermediate> {
    let p1q2 = (p1 as i64).checked_mul(q2 as i64);
    let p2q1 = (p2 as i64).checked_mul(q1 as i64);
    let p1q2 = p1q2.ok_or(FailToFindIntermediate::OutOfRange)?;
    let p2q1 = p2q1.ok_or(FailToFindIntermediate::OutOfRange)?;

    if p1q2 == p2q1 {
        return Err(FailToFindIntermediate::EqualFractions);
    }
    let (mut low, mut high) = ((0, 1), (1, 0));
    if p1q2 + 1 != p2q1 {
        loop {
            let x = (low.0 + high.0, low.1 + high.1);
            if x.0 as i64 * q1 as i64 <= x.1 as i64 * p1 as i64 {
                low = x;
            } else if p2 as i64 * x.1 as i64 <= q2 as i64 * x.0 as i64 {
                high = x;
            } else {
                return Ok(x);
            }
        }
    }
    Ok((p1 + p2, q1 + q2))
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
}
