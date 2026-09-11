import { Err, Ok, type Result } from '@boluo/utils/result';
import * as L from 'list';
import { binarySearchPosList } from '@boluo/sort';
import type { MessageItem } from './channel.types';

const findId = (items: L.List<MessageItem>, id: string): [number, MessageItem | undefined] => {
  let left = 0;
  let right = items.length;
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    const item = L.nth(mid, items)!;
    if (item.id === id) return [mid, item];
    if (item.id < id) left = mid + 1;
    else right = mid;
  }
  return [left, undefined];
};

export type MessageStoreError =
  | { type: 'DUPLICATE_ID'; id: string }
  | { type: 'INVALID_POSITION'; id: string; pos: number }
  | { type: 'INVALID_ORDER'; previousPos: number; pos: number }
  | { type: 'POSITION_COLLISION'; id: string; conflictingId: string; pos: number }
  | { type: 'HISTORY_OVERLAP'; lastPos: number; firstPos: number };

/** Persistent messages with unique IDs and strictly increasing positions. */
export class MessageStore implements Iterable<MessageItem> {
  private constructor(
    readonly ordered: L.List<MessageItem>,
    // Sorted lexically by ID for binary search.
    private readonly byId: L.List<MessageItem>,
  ) {}

  static empty(): MessageStore {
    return MessageStore.EMPTY;
  }

  static fromSortedOrThrow(items: Iterable<MessageItem>): MessageStore {
    const result = MessageStore.fromSorted(items);
    if (result.isErr) {
      throw new Error(`Cannot construct message store: ${result.err.type}`, { cause: result.err });
    }
    return result.some;
  }

  static fromSorted(items: Iterable<MessageItem>): Result<MessageStore, MessageStoreError> {
    const ordered = L.from(items);
    if (ordered.length === 0) return new Ok(MessageStore.empty());
    let previousPos = -Infinity;
    for (const item of ordered) {
      if (!Number.isFinite(item.pos)) {
        return new Err({ type: 'INVALID_POSITION', id: item.id, pos: item.pos });
      }
      if (item.pos <= previousPos) {
        return new Err({ type: 'INVALID_ORDER', previousPos, pos: item.pos });
      }
      previousPos = item.pos;
    }
    const itemsById = Array.from(ordered).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (let i = 1; i < itemsById.length; i++) {
      if (itemsById[i - 1]!.id === itemsById[i]!.id) {
        return new Err({ type: 'DUPLICATE_ID', id: itemsById[i]!.id });
      }
    }
    const byId = L.from(itemsById);
    return new Ok(new MessageStore(ordered, byId));
  }

  get length(): number {
    return this.ordered.length;
  }

  [Symbol.iterator](): Iterator<MessageItem> {
    return this.ordered[Symbol.iterator]();
  }

  get(id: string): MessageItem | undefined {
    return findId(this.byId, id)[1];
  }

  has(id: string): boolean {
    return this.get(id) !== undefined;
  }

  find(id: string): [MessageItem, number] | null {
    const item = this.get(id);
    if (!item) return null;
    const [index] = binarySearchPosList(this.ordered, item.pos);
    return [item, index];
  }

  insertOrThrow(item: MessageItem): MessageStore {
    const result = this.insert(item);
    if (result.isErr) {
      throw new Error(`Cannot insert message: ${result.err.type}`, { cause: result.err });
    }
    return result.some;
  }

  insert(item: MessageItem): Result<MessageStore, MessageStoreError> {
    const [idIndex, existing] = findId(this.byId, item.id);
    if (existing) return new Err({ type: 'DUPLICATE_ID', id: item.id });
    if (!Number.isFinite(item.pos)) {
      return new Err({ type: 'INVALID_POSITION', id: item.id, pos: item.pos });
    }
    const [index, occupying] = binarySearchPosList(this.ordered, item.pos);
    if (occupying)
      return new Err({
        type: 'POSITION_COLLISION',
        id: item.id,
        conflictingId: occupying.id,
        pos: item.pos,
      });
    return new Ok(
      new MessageStore(L.insert(index, item, this.ordered), L.insert(idIndex, item, this.byId)),
    );
  }

  mergeOrThrow(item: MessageItem): MessageStore {
    const result = this.merge(item);
    if (result.isErr) {
      throw new Error(`Cannot merge message: ${result.err.type}`, { cause: result.err });
    }
    return result.some;
  }

  /** Insert or replace by ID, including position changes. The caller decides which version to keep. */
  merge(item: MessageItem): Result<MessageStore, MessageStoreError> {
    const previous = this.get(item.id);
    if (!previous) return this.insert(item);
    if (previous.pos === item.pos) return new Ok(this.update(item));
    return this.remove(item.id).insert(item);
  }

  update(item: MessageItem): MessageStore {
    const [idIndex, previous] = findId(this.byId, item.id);
    if (!previous || previous.pos !== item.pos) {
      throw new Error('Updating a message requires an existing ID and unchanged position');
    }
    if (previous === item) return this;
    const [index] = binarySearchPosList(this.ordered, previous.pos);
    return new MessageStore(
      L.update(index, item, this.ordered),
      L.update(idIndex, item, this.byId),
    );
  }

  remove(id: string): MessageStore {
    const [idIndex, previous] = findId(this.byId, id);
    if (!previous) return this;
    if (this.length === 1) return MessageStore.empty();
    const [index] = binarySearchPosList(this.ordered, previous.pos);
    return new MessageStore(L.remove(index, 1, this.ordered), L.remove(idIndex, 1, this.byId));
  }

  prependOlderOrThrow(page: MessageStore): MessageStore {
    const result = this.prependOlder(page);
    if (result.isErr) {
      throw new Error(`Cannot prepend message history: ${result.err.type}`, { cause: result.err });
    }
    return result.some;
  }

  /** Prepend an older, ascending page. Loaded IDs are kept unchanged, regardless of page versions. */
  prependOlder(page: MessageStore): Result<MessageStore, MessageStoreError> {
    const additions = L.filter((item) => !this.has(item.id), page.ordered);
    if (additions.length === 0) return new Ok(this);
    const last = L.last(additions)!;
    const first = L.first(this.ordered);
    if (first && last.pos >= first.pos)
      return new Err({ type: 'HISTORY_OVERLAP', lastPos: last.pos, firstPos: first.pos });
    let byId = this.byId;
    for (const item of additions) {
      const [idIndex] = findId(byId, item.id);
      byId = L.insert(idIndex, item, byId);
    }
    return new Ok(new MessageStore(L.concat(additions, this.ordered), byId));
  }

  drop(count: number): MessageStore {
    if (count <= 0) return this;
    if (count >= this.length) return MessageStore.empty();
    let byId = this.byId;
    for (const item of L.take(count, this.ordered)) {
      const [idIndex] = findId(byId, item.id);
      byId = L.remove(idIndex, 1, byId);
    }
    return new MessageStore(L.drop(count, this.ordered), byId);
  }

  private static readonly EMPTY = new MessageStore(L.empty(), L.empty());
}
