use ahash::RandomState;
use papaya::HashMap as PapayaHashMap;
use std::{collections::BTreeMap, sync::LazyLock, time::Instant};
use tokio::sync::{mpsc, oneshot};

use crate::error::{AppError, ValidationFailed};
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

#[derive(Debug)]
pub enum PosAction {
    TryRestorePos {
        item_id: Uuid,
        respond_to: oneshot::Sender<Option<Rational32>>,
    },
    IsPosAvailable {
        pos: Rational32,
        item_id: Option<Uuid>,
        respond_to: oneshot::Sender<bool>,
    },
    GetNextPos {
        respond_to: oneshot::Sender<Result<i32, sqlx::Error>>,
    },
    PreviewPos {
        item_id: Uuid,
        timeout: u32,
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
    Tick,
    Shutdown,
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
        while let Some(action) = self.receiver.recv().await {
            match action {
                PosAction::TryRestorePos {
                    item_id,
                    respond_to,
                } => {
                    let result = self.handle_try_restore_pos(item_id);
                    let _ = respond_to.send(result);
                }
                PosAction::IsPosAvailable {
                    pos,
                    item_id,
                    respond_to,
                } => {
                    let result = self.handle_is_pos_available(pos, item_id);
                    let _ = respond_to.send(result);
                }
                PosAction::GetNextPos { respond_to } => {
                    let result = self.handle_get_next_pos().await;
                    let _ = respond_to.send(result);
                }
                PosAction::PreviewPos {
                    item_id,
                    timeout,
                    respond_to,
                } => {
                    let result = self.handle_preview_pos(item_id, timeout).await;
                    let _ = respond_to.send(result);
                }
                PosAction::Submitted {
                    item_id,
                    pos_p,
                    pos_q,
                    old_item_id,
                } => {
                    self.handle_submitted(item_id, pos_p, pos_q, old_item_id);
                }
                PosAction::Cancel { item_id } => {
                    let now = Instant::now();
                    self.positions.retain(|_, pos_item| {
                        !(pos_item.id == item_id || pos_item.pos_available(now))
                    });
                }
                PosAction::Shutdown => {
                    break;
                }
                PosAction::Tick => {
                    let now = Instant::now();
                    self.positions
                        .retain(|_, pos_item| !pos_item.pos_available(now));
                    if self.positions.is_empty() && self.created.elapsed().as_secs() > 60 * 60 * 4 {
                        break;
                    }
                }
            }
        }
    }

    fn handle_is_pos_available(&self, pos: Rational32, item_id: Option<Uuid>) -> bool {
        let now = Instant::now();
        if let Some(pos_item) = self.positions.get(&pos) {
            if pos_item.pos_available(now) {
                true
            } else {
                if let Some(item_id) = item_id {
                    pos_item.id == item_id
                } else {
                    false
                }
            }
        } else {
            true
        }
    }

    fn handle_try_restore_pos(&self, item_id: Uuid) -> Option<Rational32> {
        let now = Instant::now();
        self.positions
            .iter()
            .rev()
            .find(|(_, pos_item)| pos_item.id == item_id)
            .and_then(|(pos, pos_item)| {
                if pos_item.pos_available(now) {
                    Some(*pos)
                } else {
                    None
                }
            })
    }

    async fn handle_get_next_pos(&mut self) -> Result<i32, sqlx::Error> {
        if let Some((last_key, _)) = self.positions.last_key_value() {
            return Ok(last_key.ceil().numer() + 1);
        }

        let max_pos_result = {
            let mut db = crate::db::get().await.acquire().await?;
            crate::messages::Message::max_pos(&mut *db, &self.channel_id).await
        };

        match max_pos_result {
            Ok((p, q, id)) => {
                let pos = Rational32::new(p, q);
                self.positions.insert(pos, PosItem::new(id, 60 * 10));
                Ok(pos.ceil().numer() + 1)
            }
            // If the channel has no messages, use a default pos
            Err(sqlx::Error::RowNotFound) => {
                let pos = Rational32::new(42, 1);
                self.positions
                    .insert(pos, PosItem::new(Uuid::nil(), 60 * 60 * 2));
                Ok(43)
            }
            Err(e) => Err(e),
        }
    }

    async fn handle_preview_pos(
        &mut self,
        item_id: Uuid,
        timeout: u32,
    ) -> Result<Rational32, sqlx::Error> {
        if let Some(pos) = self.handle_try_restore_pos(item_id) {
            return Ok(pos);
        }

        let next_pos = self.handle_get_next_pos().await?;
        let pos_item = PosItem::new(item_id, timeout);
        let pos = Rational32::new(next_pos, 1);
        self.positions.insert(pos, pos_item);
        Ok(pos)
    }

    fn handle_submitted(
        &mut self,
        _item_id: Uuid,
        pos_p: i32,
        pos_q: i32,
        old_item_id: Option<Uuid>,
    ) {
        let pos = Rational32::new(pos_p, pos_q);
        let old_value = self.positions.remove(&pos);

        if let Some(old_item_id) = old_item_id {
            if let Some(old_value) = old_value {
                if old_value.id == old_item_id {
                    return;
                }
            }
            let now = Instant::now();
            self.positions
                .retain(|_, pos_item| !(pos_item.id == old_item_id || pos_item.pos_available(now)));
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ChannelPosError {
    #[error("Actor shutdown")]
    ActorShutdown,
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
}

impl From<ChannelPosError> for AppError {
    fn from(error: ChannelPosError) -> Self {
        match error {
            ChannelPosError::ActorShutdown => {
                AppError::Unexpected(anyhow::anyhow!("Actor shutdown"))
            }
            ChannelPosError::DatabaseError(err) => AppError::Db { source: err },
        }
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
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
            loop {
                interval.tick().await;
                CHANNEL_POS_MANAGER.tick();
            }
        });
        manager
    }
    fn get_or_create_actor(&self, channel_id: Uuid) -> mpsc::Sender<PosAction> {
        let actors = self.actors.pin();
        let result = actors.compute(channel_id, |entry| {
            if let Some((_, sender)) = entry {
                if !sender.is_closed() {
                    return papaya::Operation::Abort(sender.clone());
                }
            }
            let (sender, receiver) = mpsc::channel(1000);
            tokio::spawn(async move {
                let actor = ChannelPosActor::new(channel_id, receiver);
                actor.run().await;
            });
            papaya::Operation::Insert(sender)
        });
        match result {
            papaya::Compute::Aborted(sender) => sender,
            papaya::Compute::Updated {
                new: (_, sender), ..
            } => sender.clone(),
            papaya::Compute::Inserted(_, sender) => sender.clone(),
            papaya::Compute::Removed(_, _) => unreachable!(),
        }
    }

    pub async fn try_restore_pos(
        &self,
        channel_id: Uuid,
        item_id: Uuid,
    ) -> Result<Option<Rational32>, ChannelPosError> {
        let sender = self.get_or_create_actor(channel_id);
        let (tx, rx) = oneshot::channel();

        if sender
            .send(PosAction::TryRestorePos {
                item_id,
                respond_to: tx,
            })
            .await
            .is_err()
        {
            return Err(ChannelPosError::ActorShutdown);
        }

        rx.await.map_err(|_| ChannelPosError::ActorShutdown)
    }

    pub async fn get_next_pos(&self, channel_id: Uuid) -> Result<i32, ChannelPosError> {
        let sender = self.get_or_create_actor(channel_id);
        let (tx, rx) = oneshot::channel();

        sender
            .send(PosAction::GetNextPos { respond_to: tx })
            .await
            .map_err(|_| ChannelPosError::ActorShutdown)?;

        rx.await
            .map_err(|_| ChannelPosError::ActorShutdown)?
            .map_err(|err| ChannelPosError::DatabaseError(err))
    }

    pub async fn preview_pos(
        &self,
        channel_id: Uuid,
        item_id: Uuid,
        timeout: u32,
    ) -> Result<Rational32, ChannelPosError> {
        if let Some(pos) = self.try_restore_pos(channel_id, item_id).await? {
            return Ok(pos);
        }

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
            .map_err(|err| ChannelPosError::DatabaseError(err))
    }

    pub async fn is_pos_available(
        &self,
        channel_id: Uuid,
        pos: Rational32,
        item_id: Option<Uuid>,
    ) -> Result<bool, ChannelPosError> {
        let sender = self.get_or_create_actor(channel_id);
        let (tx, rx) = oneshot::channel();
        sender
            .send(PosAction::IsPosAvailable {
                pos,
                item_id,
                respond_to: tx,
            })
            .await
            .map_err(|_| ChannelPosError::ActorShutdown)?;
        rx.await.map_err(|_| ChannelPosError::ActorShutdown)
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
            let sender = actors.remove(&channel_id).cloned();
            sender
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
    pub fn pos_available(&self, now: Instant) -> bool {
        match self.state {
            PosItemState::LiveIn(timeout) => (now - self.created).as_secs() >= timeout as u64,
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

        // Test try_restore_pos when no position exists
        assert_eq!(
            manager.try_restore_pos(channel_id, item_id).await.unwrap(),
            None
        );

        // Test cancel operation
        manager.cancel(channel_id, item_id).await;

        // Test submitted operation
        manager.submitted(channel_id, item_id, 42, 1, None).await;

        // Test reset operation
        manager.shutdown(channel_id).await;
    }
}
