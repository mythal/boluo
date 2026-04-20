import assert from 'node:assert/strict';
import test from 'node:test';
import type { Preview, PreviewDiff } from '@boluo/api';
import { chatReducer, makeChatState } from './chat.reducer';

const ghostChannelId = 'ghost-channel';

test('chatReducer ignores messagePreview for unknown channel', () => {
  const state = makeChatState('space-1');
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

  assert.deepStrictEqual(next.channels, {});
});

test('chatReducer ignores messagePreviewDiff for unknown channel', () => {
  const state = makeChatState('space-1');
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
