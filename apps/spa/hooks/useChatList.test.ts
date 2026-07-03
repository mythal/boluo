import assert from 'node:assert/strict';
import test from 'node:test';
import * as L from 'list';
import { applyEditPreview, isPreviewInLoadedRange, pruneSelfPreview } from './useChatList';
import { type ChatItem, type MessageItem, type PreviewItem } from '../state/channel.types';

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

const makeMessageItem = (id: string, pos: number): MessageItem =>
  ({ id, pos, posP: pos, posQ: 1, modified, type: 'MESSAGE' }) as MessageItem;

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
