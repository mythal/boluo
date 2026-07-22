import assert from 'node:assert/strict';
import test from 'node:test';
import { isProfileQueryKey } from './profileCache';

test('legacy profile cache keys include every authenticated bootstrap query', () => {
  assert.strictEqual(isProfileQueryKey(['/users/query', { id: null }]), true);
  assert.strictEqual(isProfileQueryKey(['/users/settings', 'user-1']), true);
  assert.strictEqual(isProfileQueryKey(['/spaces/my', 'user-1']), true);
});

test('legacy profile cache keys exclude unrelated SWR resources', () => {
  assert.strictEqual(isProfileQueryKey(['/channels/by_space', 'space-1']), false);
  assert.strictEqual(isProfileQueryKey('/users/query'), false);
  assert.strictEqual(isProfileQueryKey(undefined), false);
});
