import assert from 'node:assert/strict';
import test from 'node:test';
import type { Preview, PreviewDiff } from '@boluo/api';
import { chatReducer, makeChatState } from './chat.reducer';

const ghostChannelId = 'ghost-channel';

test('chatReducer stores messagePreview for unknown channel', () => {
  const state = makeChatState('space-1', 1);
  const preview: Preview = {
    id: 'preview-1',
    senderId: 'user-1',
    channelId: ghostChannelId,
    name: 'Alice',
    entities: [],
    pos: 1,
  };

  const next = chatReducer(state, {
    type: 'messagePreview',
    payload: { channelId: ghostChannelId, preview, timestamp: 1 },
  });

  const channel = next.channels[ghostChannelId];
  assert.ok(channel);
  assert.strictEqual(channel.previewMap[preview.senderId]?.id, preview.id);
});

test('chatReducer ignores messagePreviewDiff for unknown channel', () => {
  const state = makeChatState('space-1', 1);
  const diff: PreviewDiff = {
    sender: 'user-1',
    _: {
      ch: ghostChannelId,
      id: 'preview-1',
      ref: 1,
      v: 2,
      op: [],
    },
  };

  const next = chatReducer(state, {
    type: 'messagePreviewDiff',
    payload: { channelId: ghostChannelId, diff, timestamp: 1 },
  });

  assert.deepStrictEqual(next.channels, {});
});

test('chatReducer treats repeated initialized events as no-op', () => {
  const initial = makeChatState('space-1', 1);
  const initialized = chatReducer(initial, { type: 'initialized', payload: {} });
  const repeated = chatReducer(initialized, { type: 'initialized', payload: {} });

  assert.strictEqual(initial.context.initialized, false);
  assert.strictEqual(initialized.context.initialized, true);
  assert.strictEqual(repeated, initialized);
  assert.strictEqual(repeated.context.sessionGeneration, 1);
});

test('chatReducer advances the session generation on reset and space changes', () => {
  const initial = makeChatState('space-1', 1);
  const reset = chatReducer(initial, { type: 'resetChatState', payload: {} });
  const changedSpace = chatReducer(reset, {
    type: 'enterSpace',
    payload: { spaceId: 'space-2' },
  });

  assert.strictEqual(reset.context.sessionGeneration, 2);
  assert.strictEqual(changedSpace.context.sessionGeneration, 3);
});
