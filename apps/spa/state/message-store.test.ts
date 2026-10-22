import assert from 'node:assert/strict';
import test from 'node:test';
import * as L from 'list';
import type { MessageItem } from './channel.types';
import { MessageStore } from './message-store';

const message = (id: string, pos: number, rev = 0): MessageItem => ({
  id,
  key: id,
  type: 'MESSAGE',
  channelId: 'channel',
  senderId: 'sender',
  name: 'Alice',
  text: id,
  entities: [],
  created: '2024-01-01T00:00:00Z',
  modified: '2024-01-01T00:00:00Z',
  rev,
  pos,
  posP: pos,
  posQ: 1,
  seed: [],
  inGame: true,
  isAction: false,
  isMaster: false,
  pinned: false,
  folded: false,
  tags: [],
  color: '#000000',
});

const assertContents = (store: MessageStore, expected: MessageItem[]) => {
  assert.deepStrictEqual(Array.from(store), expected);
  assert.strictEqual(store.length, expected.length);
  for (const [index, item] of expected.entries()) {
    assert.strictEqual(store.get(item.id), item);
    assert.strictEqual(store.has(item.id), true);
    assert.deepStrictEqual(store.find(item.id), [item, index]);
    assert.strictEqual(L.nth(index, store.ordered), item);
  }
};

test('merge inserts, replaces and moves by ID while keeping old snapshots intact', () => {
  const first = message('z', 10);
  const middle = message('a', 20);
  const last = message('m', 30);
  const initial = MessageStore.fromSortedOrThrow([first, last]);
  const inserted = initial.mergeOrThrow(middle);
  // The edited message is at position index 1, but ID index 0.
  const editedMiddle = { ...middle, text: 'edited', rev: 1 };
  const edited = inserted.mergeOrThrow(editedMiddle);
  const movedMiddle = { ...editedMiddle, pos: 40, posP: 40, rev: 2 };
  const moved = edited.mergeOrThrow(movedMiddle);
  // Version selection belongs to the caller, including when moving back to an older position.
  const restored = moved.mergeOrThrow(middle);
  const deleted = moved.remove(first.id);

  assertContents(initial, [first, last]);
  assert.strictEqual(initial.get(middle.id), undefined);
  assertContents(inserted, [first, middle, last]);
  assertContents(edited, [first, editedMiddle, last]);
  assertContents(moved, [first, last, movedMiddle]);
  assertContents(restored, [first, middle, last]);
  assert.strictEqual(restored.mergeOrThrow(middle), restored);
  assertContents(deleted, [last, movedMiddle]);
  assert.strictEqual(deleted.get(first.id), undefined);
  assert.strictEqual(deleted.find(first.id), null);
  assert.strictEqual(deleted.has(first.id), false);
});

test('older pages do not reintroduce an already loaded ID at its previous position', () => {
  const oldA = message('a', 5);
  const movedA = message('a', 30, 1);
  const older = message('older', 2);
  const existing = message('existing', 20);
  const initial = MessageStore.fromSortedOrThrow([existing, movedA]);
  const page = MessageStore.fromSortedOrThrow([older, oldA]);
  const merged = initial.prependOlderOrThrow(page);

  assertContents(initial, [existing, movedA]);
  assertContents(page, [older, oldA]);
  assertContents(merged, [older, existing, movedA]);
  assert.strictEqual(merged.prependOlderOrThrow(page), merged);
});

test('ID lookup stays independent of position order across index insertions and removals', () => {
  const items = ['z', 'a', 'm', '0', 'y', 'a-1'].map((id, i) => message(id, i + 1));
  let store = MessageStore.empty();
  for (const [index, item] of items.entries()) {
    store = store.insertOrThrow(item);
    assertContents(store, items.slice(0, index + 1));
  }
  for (const id of ['', 'a-0', 'n', 'zz']) {
    assert.strictEqual(store.get(id), undefined);
    assert.strictEqual(store.has(id), false);
    assert.strictEqual(store.find(id), null);
  }
  const snapshot = store;
  const remaining = [...items];
  for (const id of ['0', 'z', 'm', 'a', 'a-1', 'y']) {
    const index = remaining.findIndex((item) => item.id === id);
    store = store.remove(id);
    remaining.splice(index, 1);
    assertContents(store, remaining);
    assert.strictEqual(store.get(id), undefined);
  }
  assertContents(snapshot, items);
  assert.strictEqual(snapshot.remove('missing'), snapshot);
});

test('GC removes evicted IDs from the index and allows them to be loaded again', () => {
  const items = Array.from({ length: 200 }, (_, i) => message(`m-${i}`, i + 1));
  const initial = MessageStore.fromSortedOrThrow(items);
  const retained = initial.drop(150);
  assertContents(initial, items);
  assertContents(retained, items.slice(150));
  for (const item of items.slice(0, 150)) {
    assert.strictEqual(retained.get(item.id), undefined);
    assert.strictEqual(retained.find(item.id), null);
  }
  const reloaded = retained.prependOlderOrThrow(
    MessageStore.fromSortedOrThrow(items.slice(0, 150)),
  );
  assertContents(reloaded, items);
  const empty = retained.drop(retained.length);
  assertContents(empty, []);
  assert.strictEqual(empty.get('m-199'), undefined);
  const removedLast = MessageStore.fromSortedOrThrow([items[0]!]).remove(items[0]!.id);
  assertContents(removedLast, []);
  assert.strictEqual(removedLast.get(items[0]!.id), undefined);
});

test('invalid external data returns errors without changing the store', () => {
  const a = message('a', 10);
  const b = message('b', 20);
  const store = MessageStore.fromSortedOrThrow([a, b]);
  const invalidWrites = [
    [() => MessageStore.fromSorted([a, message('a', 30)]), 'DUPLICATE_ID'],
    [() => MessageStore.fromSorted([b, a]), 'INVALID_ORDER'],
    [() => MessageStore.fromSorted([a, message('b', 10)]), 'INVALID_ORDER'],
    [() => MessageStore.fromSorted([message('c', Infinity)]), 'INVALID_POSITION'],
    [() => store.insert(message('a', 30)), 'DUPLICATE_ID'],
    [() => store.insert(message('c', 10)), 'POSITION_COLLISION'],
    [() => store.insert(message('c', NaN)), 'INVALID_POSITION'],
    [() => store.merge(message('a', 20)), 'POSITION_COLLISION'],
    [() => store.merge(message('a', NaN)), 'INVALID_POSITION'],
    [
      () => store.prependOlder(MessageStore.fromSortedOrThrow([message('c', 15)])),
      'HISTORY_OVERLAP',
    ],
  ] as const;
  for (const [write, expectedType] of invalidWrites) {
    const result = write();
    assert.ok(result.isErr);
    assert.strictEqual(result.err.type, expectedType);
    assertContents(store, [a, b]);
  }
});

test('throwing methods wrap validation errors as Error causes without changing the store', () => {
  const item = message('a', 10);
  const store = MessageStore.fromSortedOrThrow([item]);
  assert.throws(() => MessageStore.fromSortedOrThrow([item, item]), {
    name: 'Error',
    message: 'Cannot construct message store: INVALID_ORDER',
    cause: { type: 'INVALID_ORDER', previousPos: 10, pos: 10 },
  });
  assert.throws(() => store.insertOrThrow(message('b', 10)), {
    name: 'Error',
    message: 'Cannot insert message: POSITION_COLLISION',
    cause: { type: 'POSITION_COLLISION', id: 'b', conflictingId: 'a', pos: 10 },
  });
  assert.throws(() => store.mergeOrThrow(message('b', 10)), {
    name: 'Error',
    message: 'Cannot merge message: POSITION_COLLISION',
    cause: { type: 'POSITION_COLLISION', id: 'b', conflictingId: 'a', pos: 10 },
  });
  const page = MessageStore.fromSortedOrThrow([message('b', 20)]);
  assert.throws(() => store.prependOlderOrThrow(page), {
    name: 'Error',
    message: 'Cannot prepend message history: HISTORY_OVERLAP',
    cause: { type: 'HISTORY_OVERLAP', lastPos: 20, firstPos: 10 },
  });
  assertContents(store, [item]);
});

test('update rejects programming errors without changing the store', () => {
  const item = message('a', 10);
  const store = MessageStore.fromSortedOrThrow([item]);
  assert.throws(() => store.update(message('missing', 10)), Error);
  assert.throws(() => store.update(message('a', 30)), Error);
  assertContents(store, [item]);
});
