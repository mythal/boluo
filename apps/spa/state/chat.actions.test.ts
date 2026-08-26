import assert from 'node:assert/strict';
import test from 'node:test';
import type { Update } from '@boluo/api';
import { extractMessageMutationAction, type ChatAction } from './chat.actions';

const channelId = 'channel-1';
const deleteAction: ChatAction<'messageDeleted'> = {
  type: 'messageDeleted',
  payload: { channelId, messageId: 'message-1', pos: 1 },
};

test('extractMessageMutationAction accepts a direct mutation action', () => {
  assert.strictEqual(extractMessageMutationAction(deleteAction), deleteAction);
});

test('extractMessageMutationAction unwraps a WebSocket update', () => {
  const update: Update = {
    mailbox: 'space-1',
    id: { timestamp: 1, node: 1, seq: 1 },
    body: { type: 'MESSAGE_DELETED', channelId, messageId: 'message-1', pos: 1 },
  };

  assert.deepStrictEqual(extractMessageMutationAction({ type: 'update', payload: update }), {
    type: 'messageDeleted',
    payload: update.body,
  });
});
