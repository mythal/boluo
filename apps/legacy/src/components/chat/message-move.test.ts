import assert from 'node:assert/strict';
import test from 'node:test';
import { List } from 'immutable';
import type { Message } from '../../api/messages';
import type { Preview } from '../../api/events';
import type { ChatItem, MessageItem, PreviewItem } from '../../states/chat-item-set';
import { prepareMessageMove } from './message-move';

const message = (id: string, pos: number): MessageItem => ({
  id,
  pos,
  mine: true,
  type: 'MESSAGE',
  message: {
    id,
    channelId: 'channel',
    pos,
    posP: Number.isInteger(pos) ? pos : pos * 2,
    posQ: Number.isInteger(pos) ? 1 : 2,
  } as Message,
});
const preview = (id: string, pos: number, draftId = 'draft'): PreviewItem => ({
  id,
  pos,
  mine: false,
  type: 'PREVIEW',
  preview: { id: draftId, senderId: id, pos } as Preview,
});
const a = message('a', 1);
const b = message('b', 2);
const c = message('c', 3);
const d = message('d', 4);
const snapshot = List<ChatItem>([a, b, c, d]);

test('resolves source and target by ID after an earlier item disappears', () => {
  assert.deepEqual(prepareMessageMove(snapshot, List([b, c, d]), 'b', 2), {
    channelId: 'channel',
    messageId: 'b',
    expectPos: [2, 1],
    range: [
      [3, 1],
      [4, 1],
    ],
  });
});

test('uses the latest neighbors, including newly loaded or filtered-out messages', () => {
  const visible = List([a, c, d]);
  assert.deepEqual(prepareMessageMove(visible, snapshot, 'd', 1)?.range, [
    [2, 1],
    [3, 1],
  ]);
  assert.deepEqual(
    prepareMessageMove(visible, List([message('older', 0.5), a, b, c, d]), 'd', 0)?.range,
    [
      [1, 2],
      [1, 1],
    ],
  );
});

test('excludes the dragged message when resolving neighbors of a moved target', () => {
  const current = List([a, message('c', 1.5), b, d]);
  assert.deepEqual(prepareMessageMove(snapshot, current, 'b', 2)?.range, [
    [3, 2],
    [4, 1],
  ]);
});

test('supports moving above the first item and below the last item', () => {
  assert.deepEqual(prepareMessageMove(snapshot, snapshot, 'd', 0)?.range, [null, [1, 1]]);
  assert.deepEqual(prepareMessageMove(snapshot, snapshot, 'a', 3)?.range, [[4, 1], null]);
});

test('cancels when the source was deleted or moved while dragging', () => {
  assert.equal(prepareMessageMove(snapshot, List([a, c, d]), 'b', 2), null);
  assert.equal(prepareMessageMove(snapshot, List([a, c, d, message('b', 5)]), 'b', 2), null);
});

test('allows content edits that leave the source position unchanged', () => {
  const edited = { ...b, message: { ...b.message, rev: 2, text: 'edited' } };
  assert.deepEqual(
    prepareMessageMove(snapshot, List([a, edited, c, d]), 'b', 2)?.expectPos,
    [2, 1],
  );
});

test('cancels when a target message or preview disappears', () => {
  assert.equal(prepareMessageMove(snapshot, List([a, b, d]), 'b', 2), null);
  const withPreview = List<ChatItem>([a, b, preview('writer', 3)]);
  assert.equal(prepareMessageMove(withPreview, List([a, b]), 'a', 2), null);
});

test('does not confuse a new preview from the same sender with the original target', () => {
  const original = List<ChatItem>([a, b, preview('writer', 3)]);
  const current = List<ChatItem>([a, b, preview('writer', 4, 'new-draft')]);
  assert.equal(prepareMessageMove(original, current, 'a', 2), null);
});

test('uses the latest position of the same preview', () => {
  const original = List<ChatItem>([a, b, preview('writer', 3)]);
  const current = List<ChatItem>([a, b, preview('writer', 5)]);
  assert.deepEqual(prepareMessageMove(original, current, 'a', 2)?.range, [[5, 1], null]);
});

test('finds neighbors using rounded preview positions without dropping real bounds', () => {
  const current = List<ChatItem>([a, preview('writer', 2.8), c, d]);
  assert.deepEqual(prepareMessageMove(snapshot, current, 'd', 2)?.range, [
    [1, 1],
    [3, 1],
  ]);
});

test('rejects invalid indices, unknown sources, and unchanged destinations', () => {
  assert.equal(prepareMessageMove(snapshot, snapshot, 'a', -1), null);
  assert.equal(prepareMessageMove(snapshot, snapshot, 'a', 4), null);
  assert.equal(prepareMessageMove(snapshot, snapshot, 'missing', 2), null);
  assert.equal(prepareMessageMove(snapshot, snapshot, 'a', 0), null);
});
