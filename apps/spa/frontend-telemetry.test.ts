import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeFrontendLogArguments } from '@boluo/utils/frontend-telemetry';

test('serializeFrontendLogArguments preserves structured diagnostic details', () => {
  const context: Record<string, unknown> = {
    message: { id: 'message-1', pos: 3, rev: 2 },
    count: 3n,
  };
  context.self = context;

  const serialized = serializeFrontendLogArguments(['Unexpected message position', context]);

  assert.match(serialized, /^Unexpected message position /);
  assert.match(serialized, /"id":"message-1"/);
  assert.match(serialized, /"pos":3/);
  assert.match(serialized, /"rev":2/);
  assert.match(serialized, /"count":"3n"/);
  assert.match(serialized, /"self":"\[Circular\]"/);
  assert.doesNotMatch(serialized, /\[object Object\]/);
});

test('serializeFrontendLogArguments preserves nested Error details', () => {
  const serialized = serializeFrontendLogArguments([
    'Failed to handle WebSocket message',
    { error: new TypeError('invalid update'), mailboxId: 'space-1' },
  ]);

  assert.match(serialized, /"name":"TypeError"/);
  assert.match(serialized, /"message":"invalid update"/);
  assert.match(serialized, /"mailboxId":"space-1"/);
});

test('serializeFrontendLogArguments summarizes Response objects', () => {
  const response = new Response(null, { status: 503, statusText: 'Service Unavailable' });
  const serialized = serializeFrontendLogArguments(['Upload failed', { response }]);

  assert.match(serialized, /"status":503/);
  assert.match(serialized, /"statusText":"Service Unavailable"/);
});
