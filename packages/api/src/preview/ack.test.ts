import assert from 'node:assert/strict';
import test from 'node:test';
import type { PreviewPost, Update } from '@boluo/types/bindings';
import {
  expectedPreviewKeyframeAcknowledgement,
  extractOwnPreviewAcknowledgement,
  matchesPreviewAcknowledgement,
  publishOwnPreviewAcknowledgement,
  subscribePreviewAcknowledgement,
} from './ack';

const userId = 'user-1';
const channelId = 'channel-1';
const previewId = 'preview-1';

const makePreviewPost = (overrides: Partial<PreviewPost> = {}): PreviewPost => ({
  id: previewId,
  v: 1,
  channelId,
  name: 'Alice',
  mediaId: null,
  inGame: true,
  isAction: false,
  text: 'hello',
  clear: false,
  entities: [{ type: 'Text', start: 0, len: 5 }],
  editFor: null,
  edit: null,
  ...overrides,
});

const makeKeyframeUpdate = (
  overrides: Partial<Update['body'] & { type: 'MESSAGE_PREVIEW' }> = {},
): Update => ({
  mailbox: 'space-1',
  id: { timestamp: 1, node: 1, seq: 1 },
  live: 'V',
  body: {
    type: 'MESSAGE_PREVIEW',
    channelId,
    preview: {
      ...makePreviewPost(),
      senderId: userId,
      pos: 1,
    },
    ...overrides,
  },
});

const makeDiffUpdate = (): Update => ({
  mailbox: 'space-1',
  id: { timestamp: 2, node: 1, seq: 1 },
  live: 'V',
  body: {
    type: 'DIFF',
    channelId,
    diff: {
      sender: userId,
      _: {
        ch: channelId,
        id: previewId,
        ref: 1,
        v: 2,
        op: [{ type: 'A', _: ' world' }],
      },
    },
  },
});

test('extractOwnPreviewAcknowledgement extracts accepted keyframes from the current user', () => {
  const acknowledgement = extractOwnPreviewAcknowledgement(makeKeyframeUpdate(), userId);
  assert.ok(acknowledgement);
  assert.strictEqual(acknowledgement.type, 'KEYFRAME');
  assert.strictEqual(acknowledgement.previewId, previewId);
  assert.strictEqual(acknowledgement.version, 1);

  assert.strictEqual(extractOwnPreviewAcknowledgement(makeKeyframeUpdate(), 'other-user'), null);
});

test('extractOwnPreviewAcknowledgement extracts accepted diffs from the current user', () => {
  assert.deepStrictEqual(extractOwnPreviewAcknowledgement(makeDiffUpdate(), userId), {
    type: 'DIFF',
    channelId,
    previewId,
    keyframeVersion: 1,
    version: 2,
  });
});

test('keyframe acknowledgement matching includes the normalized target', () => {
  const expected = expectedPreviewKeyframeAcknowledgement(makePreviewPost({ text: 'new text' }));
  const staleAcknowledgement = extractOwnPreviewAcknowledgement(makeKeyframeUpdate(), userId);
  assert.ok(staleAcknowledgement);

  assert.strictEqual(matchesPreviewAcknowledgement(expected, staleAcknowledgement), false);
});

test('keyframe acknowledgement normalizes editFor derived by the server from edit.time', () => {
  const edit = { time: '2024-01-01T00:00:00.000Z', p: 42, q: 1 };
  const expected = expectedPreviewKeyframeAcknowledgement(makePreviewPost({ edit, editFor: null }));
  const acknowledgement = extractOwnPreviewAcknowledgement(
    makeKeyframeUpdate({
      preview: {
        ...makePreviewPost({ edit, editFor: edit.time }),
        senderId: userId,
        pos: 42,
      },
    }),
    userId,
  );
  assert.ok(acknowledgement);

  assert.strictEqual(matchesPreviewAcknowledgement(expected, acknowledgement), true);
});

test('publishOwnPreviewAcknowledgement notifies subscribers and supports unsubscribe', () => {
  const source = { id: 'connection-1' };
  const events: unknown[] = [];
  const unsubscribe = subscribePreviewAcknowledgement((event) => {
    events.push(event);
  });

  publishOwnPreviewAcknowledgement(makeDiffUpdate(), userId, source);
  assert.strictEqual(events.length, 1);
  assert.strictEqual((events[0] as { source: object }).source, source);
  unsubscribe();
  publishOwnPreviewAcknowledgement(makeDiffUpdate(), userId, source);
  assert.strictEqual(events.length, 1);
});
