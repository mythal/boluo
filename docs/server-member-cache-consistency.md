# Server 成员缓存一致性问题记录

## 背景

服务端的频道成员读取路径为了降低数据库压力，会优先读取事件系统中的成员状态缓存。相关模块主要包括：

- `apps/server/src/channels/models.rs`
- `apps/server/src/events/context.rs`
- `apps/server/src/events/context/members.rs`
- `apps/server/src/events/context/members_actor.rs`

核心数据流如下：

1. REST handler 调用 `ChannelMember` / `Member` 的模型方法读写数据库。
2. `ChannelMember::is_master`、`ChannelMember::get`、`ChannelMember::get_with_space_member`、`Member::get_by_channel` 等读路径会优先访问 `MailboxManager`。
3. `MailboxManager` 通过 `members_actor` 持有一个单线程 actor 状态。
4. actor 内部的 `MembersCache` 缓存 `ChannelMember` 和 `SpaceMember`。
5. 如果 actor 缓存未加载或查询失败，读路径回退到 PostgreSQL。

这套设计的优点是 websocket 事件状态和 HTTP 查询可以共享一份内存状态，避免重复访问数据库。问题是，只要数据库写入和 actor 缓存更新之间不是同一顺序边界，就会出现短时间的读写不一致。

## 已发现的问题

本次 flaky test 的直接触发点是 `channels::models::tests::db_test_channel_member_flow`。测试在修改频道成员权限之后，马上调用 `ChannelMember::is_master` 校验结果。

旧实现中，部分写路径会先完成数据库写入，然后用 `tokio::spawn` 在后台更新 `MembersCache`。请求返回时，后台任务可能还没有执行。随后立即发生的读请求会优先访问已有的 `MailboxManager`，从 actor 缓存读到旧值，于是出现偶发失败。

典型竞态如下：

1. `set_master` 写入 PostgreSQL。
2. `set_master` 后台 `spawn` 一个 `update_channel_member`。
3. `set_master` 返回。
4. 测试立刻调用 `is_master`。
5. `is_master` 先读 `MailboxManager`。
6. 如果后台更新还没进入或还没被 actor 处理，读到旧的 `is_master`。

这个问题不是 PostgreSQL 事务可见性问题，而是本地 actor 缓存和数据库写入之间缺少一致性边界。

## 当前修正状态

当前代码已经把直接相关的频道成员写路径从后台更新改成了同步等待更新入队：

- `ChannelMember::add_user`
- `ChannelMember::remove_user`
- `ChannelMember::remove_user_by_space`
- `ChannelMember::edit`
- `ChannelMember::set_master`

其中 `MailboxManager::update_channel_member`、`remove_member`、`remove_member_from_channel` 等方法当前只保证 action 已成功发送到 `members_actor` 的 mpsc 队列，并不等待 actor 实际处理完成。

这个语义对当前读写一致性是够用的，因为同一个 actor 的读 action 和写 action 共用同一个 FIFO 队列。只要写请求返回前已经把写 action 入队，之后发起的读 action 会排在它后面处理。

当前修正解决的是“写请求已经返回，但后续读可能排在写 action 前面”的问题。

## 当前取舍

这次修正把部分原本后台执行的操作放回了请求路径，因此一些操作的尾延迟可能变高。主要来源有两个：

1. `CACHE.invalidate(...).await` 不只删除本地 cache，还会等待 Redis pubsub 通知。
2. 如果 `members_actor` 的队列满了，`send_members_write_action` 会等待 `mpsc::Sender::send`，最多等待 `MAILBOX_STATE_WRITE_TIMEOUT`。

正常情况下，`members_actor` 写入会走 `try_send`，成本只是一次内存队列入队。真正更容易引入外部延迟的是 Redis publish。

所以当前状态是一个偏保守的修正：优先保证 read-after-write 正确性，暂时接受一些请求路径延迟。后续应该把“一致性必须同步完成的部分”和“可以最终一致的通知/刷新”拆开。

## 仍然存在的风险

### 后台整频道刷新可能覆盖新状态

`Member::load_to_cache` 仍然会在后台加载整个频道成员列表，然后调用 `set_members` 覆盖 `MembersCache` 中的频道状态。

理论上的风险如下：

1. 后台刷新开始，查询数据库得到一个旧快照。
2. 某个成员写操作发生，并同步入队 `UpdateChannelMember`。
3. 后台刷新稍后完成，并入队 `UpdateByMembers`。
4. `UpdateByMembers` 用旧快照覆盖较新的单条更新。

这个风险在当前代码中比之前小，因为写路径不再主动调用 `Member::load_to_cache` 作为缓存预热。但 `members_actor` 的 refresh 路径仍然可能触发后台刷新。

### `UpdateChannelMember` 只更新已加载频道

`MembersCache::UpdateChannelMember` 在频道未加载时会直接返回。这是当前设计的一部分，避免只靠单条成员更新构造不完整的频道成员状态。

这个行为本身合理，但它意味着“单条写入更新 manager”不是缓存加载机制，只是已加载缓存的增量维护。未加载频道仍然依赖 DB fallback 或整频道加载。

### 跨节点一致性和本地一致性混在一起

`CACHE.invalidate` 同时做两件事：

1. 删除本进程内的 quick-cache 条目。
2. 通过 Redis pubsub 通知其他节点。

当前项目主要是 single-node，但代码已经包含跨节点 cache invalidate 的机制。对本地 read-after-write 来说，第一步必须同步完成；第二步可以异步完成。把这两者绑定在同一个 `await` 里，会把网络 IO 引入所有本地写路径。

## 建议设计

### 目标

后续设计应同时满足这些目标：

- 同进程内保证 read-after-write。
- 不把 Redis pubsub、整频道刷新等最终一致操作放在请求关键路径。
- 避免后台整频道刷新覆盖较新的增量写入。
- 保持现有 actor 模型，不引入全局锁或复杂跨模块事务。
- 在 actor 队列满、Redis 慢、后台刷新慢时有明确降级行为。

### 方案一：拆分本地 cache invalidation 和远程通知

这是优先级最高、改动最小的优化。

把 `CacheStore::invalidate` 拆成两个语义：

```rust
CACHE.invalidate_local(CacheType::ChannelMembers, user_id);
CACHE.notify_invalidate(CacheType::ChannelMembers, user_id).await;
```

然后在写路径中使用：

```rust
CACHE.invalidate_local(CacheType::ChannelMembers, user_id);
CACHE.notify_invalidate_background(CacheType::ChannelMembers, user_id);
```

建议保留一个兼容方法：

```rust
pub async fn invalidate(&self, cache_type: CacheType, key: Uuid) {
    self.invalidate_local(cache_type, key);
    self.notify_invalidate(cache_type, key).await;
}
```

这样可以逐步迁移高频写路径，不必一次性改完整个项目。

本地一致性依赖 `invalidate_local`，跨节点一致性依赖后台通知。Redis publish 失败时记录日志即可，不应阻塞用户请求。

### 方案二：明确 members actor 的入队屏障语义

当前 `MailboxManager::update_channel_member(...).await` 的实际语义是“写 action 已入队”，不是“写 action 已应用”。这个语义可以保留，但应在 API 名称或注释中明确。

建议新增更清晰的方法名，或者在现有方法上加文档注释：

```rust
/// Enqueues a member cache mutation.
///
/// Once this returns, later read actions sent through the same manager will be
/// processed after this mutation. This does not wait for the actor to apply it.
pub async fn enqueue_channel_member_update(...)
```

这样后续维护者不会误以为 `.await` 等到了 actor 处理完成，也不会随手改回 `tokio::spawn`。

### 方案三：给整频道刷新增加版本保护

为了防止后台 `UpdateByMembers` 覆盖较新的单条更新，`MembersCache` 可以维护每个频道的版本号。

一种实现方式：

1. `members_actor` 为每个频道维护 `generation`。
2. 每次增量写入时递增该频道 `generation`。
3. 启动整频道刷新前记录当前 `generation`。
4. 刷新完成后发送 `UpdateByMembers { channel_id, members, generation }`。
5. actor 处理 `UpdateByMembers` 时，如果当前 `generation` 已经大于刷新开始时的 `generation`，丢弃这个刷新结果。

伪代码：

```rust
enum Action {
    UpdateChannelMember(ChannelMember),
    UpdateByMembers {
        channel_id: Uuid,
        members: Vec<Member>,
        generation: u64,
    },
}

struct MembersCache {
    channel_generations: HashMap<Uuid, u64>,
}
```

这个方案能保留后台刷新，同时避免旧快照覆盖新写入。

### 方案四：用 dirty 标记替代部分同步更新

如果后续发现 actor 队列入队也会显著影响尾延迟，可以进一步引入 dirty 标记。

写路径只同步做两件事：

1. 删除本地 quick-cache。
2. 向 members actor 入队一个很小的 dirty action。

例如：

```rust
MembersAction::MarkChannelMemberDirty {
    channel_id,
    user_id,
}
```

读路径遇到 dirty member 或 dirty channel 时，不返回可能过期的 actor 缓存，而是返回 `NotFullyLoaded`，让现有逻辑回源数据库。后台任务再异步刷新 actor 状态。

这个方案的优点是请求路径更短，且不会返回旧值。缺点是热点写入后可能增加 DB fallback，需要配合 refresh 合并和冷却窗口。

### 方案五：为成员缓存设计专门的测试

建议增加覆盖以下场景的测试：

- `set_master` 后立即 `is_master`。
- `edit` 后立即 `get`。
- `remove_user` 后立即 `get_member`。
- `add_user` 后在已加载频道中立即查询成员列表。
- 后台 `load_to_cache` 和增量写入交错时，不允许旧刷新覆盖新写入。

其中最后一类测试需要给 `Member::load_to_cache` 或 `MembersCache` 增加可控注入点，否则很难稳定复现。

## 推荐实施顺序

1. 拆分 `CACHE.invalidate`，让本地删除同步、Redis 通知后台化。
2. 给 `MailboxManager` 的成员写入 API 明确“入队屏障”语义。
3. 给 `Member::load_to_cache` / `UpdateByMembers` 加 generation，防止旧快照覆盖新状态。
4. 视性能数据决定是否引入 dirty 标记和 DB fallback。
5. 补充专门的成员缓存一致性测试。

第一步可以直接降低请求路径延迟，风险最小。第三步解决剩余的核心一致性风险。第四步属于性能优化，应在有 p95/p99 数据之后再做。
