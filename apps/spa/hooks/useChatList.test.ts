import assert from 'node:assert/strict';
import test from 'node:test';
import { atom, createStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import * as L from 'list';
import {
  applyEditPreview,
  areChatListsReferentiallyEqual,
  isMessageNewerThanOptimisticRef,
  isPreviewInLoadedRange,
  pruneSelfPreview,
  reconcileVirtualChatList,
  selectParsedIsEmpty,
  START_INDEX,
  virtualChatItemKey,
} from './useChatList';
import { type ChatItem, type MessageItem, type PreviewItem } from '../state/channel.types';
import { type OptimisticItem } from '../state/channel.reducer';

test('isPreviewInLoadedRange uses loaded range instead of filtered visible range', () => {
  const loadedMinPos = 1;
  const filteredVisibleMinPos = 10;
  const previewPos = 5;

  assert.strictEqual(isPreviewInLoadedRange(previewPos, filteredVisibleMinPos, false), false);
  assert.strictEqual(isPreviewInLoadedRange(previewPos, loadedMinPos, false), true);
});

test('isPreviewInLoadedRange only allows previews above unloaded history when fully loaded', () => {
  const loadedMinPos = 10;
  const previewPos = 5;

  assert.strictEqual(isPreviewInLoadedRange(previewPos, loadedMinPos, false), false);
  assert.strictEqual(isPreviewInLoadedRange(previewPos, loadedMinPos, true), true);
});

const makePreview = (id: string, senderId: string): PreviewItem =>
  ({ id, senderId }) as PreviewItem;

const myId = 'me';

test('pruneSelfPreview keeps a live self preview', () => {
  const list = [makePreview('p-alice', 'alice'), makePreview('p-self', myId)];

  const hasSelfPreview = pruneSelfPreview(list, myId, 'p-self', false, true);

  assert.strictEqual(hasSelfPreview, true);
  assert.deepStrictEqual(
    list.map((preview) => preview.id),
    ['p-alice', 'p-self'],
  );
});

test('pruneSelfPreview removes only the self preview when it is stale, empty, and hidden', () => {
  // Regression: the old logic spliced twice at the same index when the self
  // preview was both stale and hidden, wrongly removing another user's preview.
  const list = [
    makePreview('p-alice', 'alice'),
    makePreview('p-stale-self', myId),
    makePreview('p-bob', 'bob'),
  ];

  const hasSelfPreview = pruneSelfPreview(list, myId, 'p-new', true, false);

  assert.strictEqual(hasSelfPreview, false);
  assert.deepStrictEqual(
    list.map((preview) => preview.id),
    ['p-alice', 'p-bob'],
  );
});

test('pruneSelfPreview removes a hidden self preview', () => {
  const list = [makePreview('p-self', myId), makePreview('p-bob', 'bob')];

  const hasSelfPreview = pruneSelfPreview(list, myId, 'p-self', false, false);

  assert.strictEqual(hasSelfPreview, false);
  assert.deepStrictEqual(
    list.map((preview) => preview.id),
    ['p-bob'],
  );
});

test('pruneSelfPreview leaves the list untouched without a self preview', () => {
  const list = [makePreview('p-alice', 'alice'), makePreview('p-bob', 'bob')];

  const hasSelfPreview = pruneSelfPreview(list, myId, 'p-new', true, false);

  assert.strictEqual(hasSelfPreview, false);
  assert.deepStrictEqual(
    list.map((preview) => preview.id),
    ['p-alice', 'p-bob'],
  );
});

const modified = '2024-01-01T00:00:00.000Z';

test('parsed empty selection ignores changes between non-empty parse results', () => {
  const parsedAtom = atom<{ entities: unknown[] }>({ entities: [] });
  const parsedIsEmptyAtom = selectAtom(parsedAtom, selectParsedIsEmpty);
  const store = createStore();
  let notifications = 0;
  const unsubscribe = store.sub(parsedIsEmptyAtom, () => {
    notifications++;
  });

  assert.strictEqual(store.get(parsedIsEmptyAtom), true);
  store.set(parsedAtom, { entities: [{}] });
  assert.strictEqual(store.get(parsedIsEmptyAtom), false);
  assert.strictEqual(notifications, 1);

  store.set(parsedAtom, { entities: [{ changed: true }] });
  assert.strictEqual(store.get(parsedIsEmptyAtom), false);
  assert.strictEqual(notifications, 1);

  store.set(parsedAtom, { entities: [] });
  assert.strictEqual(store.get(parsedIsEmptyAtom), true);
  assert.strictEqual(notifications, 2);
  unsubscribe();
});

const makeMessageItem = (
  id: string,
  pos: number,
  overrides: Partial<MessageItem> = {},
): MessageItem =>
  ({
    id,
    key: id,
    pos,
    posP: pos,
    posQ: 1,
    modified,
    type: 'MESSAGE',
    ...overrides,
  }) as MessageItem;

test('areChatListsReferentiallyEqual accepts different arrays with identical item references', () => {
  const a = makeMessageItem('m-a', 1);
  const b = makeMessageItem('m-b', 2);

  assert.strictEqual(areChatListsReferentiallyEqual([a, b], [a, b]), true);
});

test('areChatListsReferentiallyEqual rejects changed item references and lengths', () => {
  const a = makeMessageItem('m-a', 1);
  const b = makeMessageItem('m-b', 2);

  assert.strictEqual(areChatListsReferentiallyEqual([a, b], [{ ...a }, b]), false);
  assert.strictEqual(areChatListsReferentiallyEqual([a, b], [a]), false);
});

test('reconcileVirtualChatList tracks a rendered preview prepended before the previous head', () => {
  const originalHead = makeMessageItem('m-head', 10);
  const previous = reconcileVirtualChatList(undefined, [originalHead], 'ALL:VISIBLE');
  const editPreview = {
    ...makeEditPreview('m-archived', 5),
    key: 'editor',
  };

  const next = reconcileVirtualChatList(previous, [editPreview, originalHead], 'ALL:VISIBLE');

  assert.strictEqual(next.firstItemIndex, START_INDEX - 1);
  assert.strictEqual(next.epoch, previous.epoch);
});

test('reconcileVirtualChatList restores the index when a head preview is removed', () => {
  const originalHead = makeMessageItem('m-head', 10);
  const preview = {
    ...makeEditPreview('m-archived', 5),
    key: 'editor',
  };
  const initial = reconcileVirtualChatList(undefined, [originalHead], 'ALL:VISIBLE');
  const withPreview = reconcileVirtualChatList(initial, [preview, originalHead], 'ALL:VISIBLE');

  const withoutPreview = reconcileVirtualChatList(withPreview, [originalHead], 'ALL:VISIBLE');

  assert.strictEqual(withoutPreview.firstItemIndex, START_INDEX);
  assert.strictEqual(withoutPreview.epoch, initial.epoch);
});

test('reconcileVirtualChatList tracks deletion at a filtered list head', () => {
  const filteredHead = makeMessageItem('m-filtered-head', 5);
  const originalHead = makeMessageItem('m-original-head', 10);
  const previous = reconcileVirtualChatList(
    undefined,
    [filteredHead, originalHead],
    'IN_GAME:VISIBLE',
  );

  const next = reconcileVirtualChatList(previous, [originalHead], 'IN_GAME:VISIBLE');

  assert.strictEqual(next.firstItemIndex, START_INDEX + 1);
  assert.strictEqual(next.epoch, previous.epoch);
});

test('reconcileVirtualChatList preserves firstItemIndex for in-place reordering', () => {
  const a = makeMessageItem('m-a', 1);
  const b = makeMessageItem('m-b', 2);
  const c = makeMessageItem('m-c', 3);
  const previous = reconcileVirtualChatList(undefined, [a, b, c], 'ALL:VISIBLE');

  const next = reconcileVirtualChatList(previous, [b, c, a], 'ALL:VISIBLE');

  assert.strictEqual(next.firstItemIndex, previous.firstItemIndex);
  assert.strictEqual(next.epoch, previous.epoch);
});

test('reconcileVirtualChatList ignores insertions after a stable rendered head', () => {
  const a = makeMessageItem('m-a', 1);
  const b = makeMessageItem('m-b', 3);
  const previous = reconcileVirtualChatList(undefined, [a, b], 'ALL:VISIBLE');

  const next = reconcileVirtualChatList(
    previous,
    [a, makeMessageItem('m-middle', 2), b],
    'ALL:VISIBLE',
  );

  assert.strictEqual(next.firstItemIndex, previous.firstItemIndex);
  assert.strictEqual(next.epoch, previous.epoch);
});

test('reconcileVirtualChatList counts only rendered head items removed by GC', () => {
  const movedRawHead = makeMessageItem('m-raw-head', 1);
  const renderedHead = makeMessageItem('m-rendered-head', 2);
  const retained = makeMessageItem('m-retained', 49);
  const bottom = makeMessageItem('m-bottom', 50);
  const previous = reconcileVirtualChatList(
    undefined,
    [renderedHead, retained, movedRawHead, bottom],
    'ALL:VISIBLE',
  );

  const next = reconcileVirtualChatList(previous, [retained, bottom], 'ALL:VISIBLE');

  assert.strictEqual(next.firstItemIndex, START_INDEX + 1);
  assert.strictEqual(next.epoch, previous.epoch);
});

test('reconcileVirtualChatList does not rebuild for an unrelated item content update', () => {
  const message = makeMessageItem('m-a', 1, { text: 'before' });
  const previous = reconcileVirtualChatList(undefined, [message], 'IN_GAME:VISIBLE');

  const next = reconcileVirtualChatList(
    previous,
    [{ ...message, text: 'after' }],
    'IN_GAME:VISIBLE',
  );

  assert.strictEqual(next.firstItemIndex, previous.firstItemIndex);
  assert.strictEqual(next.epoch, previous.epoch);
});

test('reconcileVirtualChatList rebuilds when structural changes and reordering are ambiguous', () => {
  const a = makeMessageItem('m-a', 1);
  const b = makeMessageItem('m-b', 2);
  const c = makeMessageItem('m-c', 3);
  const previous = reconcileVirtualChatList(undefined, [a, b, c], 'ALL:VISIBLE');

  const next = reconcileVirtualChatList(
    previous,
    [makeMessageItem('m-new', 0), b, a, c],
    'ALL:VISIBLE',
  );

  assert.strictEqual(next.firstItemIndex, START_INDEX);
  assert.strictEqual(next.epoch, previous.epoch + 1);
});

test('reconcileVirtualChatList rebuilds when the pane filter changes', () => {
  const message = makeMessageItem('m-a', 1);
  const previous = reconcileVirtualChatList(undefined, [message], 'ALL:VISIBLE');

  const next = reconcileVirtualChatList(previous, [message], 'IN_GAME:VISIBLE');

  assert.strictEqual(next.firstItemIndex, START_INDEX);
  assert.strictEqual(next.epoch, previous.epoch + 1);
});

test('virtualChatItemKey namespaces message and preview keys', () => {
  const message = makeMessageItem('same', 1, { key: 'same' });
  const preview = { ...makePreview('preview', 'same'), type: 'PREVIEW' as const, key: 'same' };

  assert.strictEqual(virtualChatItemKey(message), 'MESSAGE:same');
  assert.strictEqual(virtualChatItemKey(preview), 'PREVIEW:same');
});

const makeEditPreview = (id: string, pos: number, editTime = modified): PreviewItem =>
  ({
    id,
    senderId: 'editor',
    pos,
    posP: pos,
    posQ: 1,
    type: 'PREVIEW',
    edit: { time: editTime, p: pos, q: 1 },
  }) as PreviewItem;

test('applyEditPreview replaces a moved message at its current position', () => {
  // Regression: when the edited message was moved and its old position was
  // occupied, the old logic removed the message and then skipped the insertion.
  const messageA = makeMessageItem('m-a', 1);
  const messageB = makeMessageItem('m-b', 3);
  const moved = makeMessageItem('m-moved', 6);
  const messages = L.from([messageA, messageB, moved]);
  const itemList: ChatItem[] = [messageA, messageB, moved];
  const stalePreview = makeEditPreview('m-moved', 3);

  const resolved = applyEditPreview(stalePreview, messages, itemList);

  assert.strictEqual(resolved, null);
  assert.deepStrictEqual(
    itemList.map((item) => [item.id, item.type, item.pos]),
    [
      ['m-a', 'MESSAGE', 1],
      ['m-b', 'MESSAGE', 3],
      ['m-moved', 'PREVIEW', 6],
    ],
  );
  const placed = itemList[2] as PreviewItem;
  assert.strictEqual(placed.original?.id, 'm-moved');
});

test('applyEditPreview follows the moved message when it is filtered from the list', () => {
  const message = makeMessageItem('m-filtered', 6);
  const messages = L.from([makeMessageItem('m-a', 1), message]);
  const itemList: ChatItem[] = [makeMessageItem('m-a', 1)];
  const stalePreview = makeEditPreview('m-filtered', 3);

  const resolved = applyEditPreview(stalePreview, messages, itemList);

  assert.ok(resolved);
  assert.strictEqual(resolved.pos, 6);
  assert.strictEqual(resolved.posP, 6);
  assert.strictEqual(resolved.posQ, 1);
  assert.strictEqual(resolved.original?.id, 'm-filtered');
  assert.strictEqual(itemList.length, 1);
});

test('applyEditPreview skips a preview whose edit time no longer matches', () => {
  const message = makeMessageItem('m-edited', 3);
  const messages = L.from([message]);
  const itemList: ChatItem[] = [message];
  const stalePreview = makeEditPreview('m-edited', 3, '2023-12-31T00:00:00.000Z');

  const resolved = applyEditPreview(stalePreview, messages, itemList);

  assert.strictEqual(resolved, null);
  assert.deepStrictEqual(itemList, [message]);
});

test('applyEditPreview skips a preview whose message is gone', () => {
  const message = makeMessageItem('m-a', 1);
  const messages = L.from([message]);
  const itemList: ChatItem[] = [message];
  const preview = makeEditPreview('m-deleted', 3);

  const resolved = applyEditPreview(preview, messages, itemList);

  assert.strictEqual(resolved, null);
  assert.deepStrictEqual(itemList, [message]);
});

test('isMessageNewerThanOptimisticRef uses message rev instead of client time', () => {
  const ref = makeMessageItem('m-edit', 1, { rev: 1 });
  const optimistic: OptimisticItem = {
    optimisticPos: 1,
    timestamp: Date.parse('2099-01-01T00:00:00.000Z'),
    item: { ...ref, text: 'optimistic' },
  };
  const serverItem = makeMessageItem('m-edit', 1, { rev: 2 });

  assert.strictEqual(isMessageNewerThanOptimisticRef(serverItem, optimistic, ref), true);
});

test('isMessageNewerThanOptimisticRef falls back to server modified timestamps', () => {
  const ref = makeMessageItem('m-edit', 1, {
    modified: '2024-01-01T00:00:00.000Z',
  });
  const optimistic: OptimisticItem = {
    optimisticPos: 1,
    timestamp: Date.parse('2099-01-01T00:00:00.000Z'),
    item: { ...ref, text: 'optimistic' },
  };
  const serverItem = makeMessageItem('m-edit', 1, {
    modified: '2024-01-01T00:01:00.000Z',
  });

  assert.strictEqual(isMessageNewerThanOptimisticRef(serverItem, optimistic, ref), true);
});

test('isMessageNewerThanOptimisticRef keeps optimistic item when version is unchanged', () => {
  const ref = makeMessageItem('m-edit', 1, { rev: 1 });
  const optimistic: OptimisticItem = {
    optimisticPos: 1,
    timestamp: Date.parse('2024-01-01T00:01:00.000Z'),
    item: { ...ref, text: 'optimistic' },
  };

  assert.strictEqual(isMessageNewerThanOptimisticRef(ref, optimistic, ref), false);
});
