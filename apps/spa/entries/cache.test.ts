import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScopedMutator } from 'swr';
import { entryQueryKeys } from '@boluo/hooks/entryQueryKeys';
import { refreshEntries } from './cache';
import { matchesMessageComponentHistory } from './useMessageComponentHistory';

test('entry refresh covers lists and details without touching other scopes or spaces', async () => {
  const keys = [
    entryQueryKeys.byScope('space', 'scope'),
    entryQueryKeys.byComponent('space', 'scope', 'core/counter'),
    entryQueryKeys.byComponent('space', 'scope', 'core/portrait'),
    entryQueryKeys.entry('space', 'scope', 'hp'),
    entryQueryKeys.entry('space', 'scope', 'mp'),
    entryQueryKeys.byComponent('other-space', 'scope', 'core/counter'),
    entryQueryKeys.entry('space', 'other-scope', 'hp'),
  ];
  const refreshed: unknown[] = [];
  const mutate = ((key: unknown) => {
    if (typeof key === 'function') refreshed.push(...keys.filter(key as (key: unknown) => boolean));
    else refreshed.push(key);
    return Promise.resolve();
  }) as ScopedMutator;

  await refreshEntries(mutate, 'space', 'scope');
  assert.deepEqual(refreshed, keys.slice(0, 5));

  refreshed.length = 0;
  await refreshEntries(mutate, 'space', 'scope', 'hp');
  assert.deepEqual(refreshed, keys.slice(0, 4));
});

test('message history refresh matches all revisions of only the affected message', () => {
  const matches = matchesMessageComponentHistory('space', 'message');
  assert.ok(matches(['/entries/effects_by_messages', 'space', 'message', 0]));
  assert.ok(matches(['/entries/effects_by_messages', 'space', 'message', 2]));
  assert.equal(matches(['/entries/effects_by_messages', 'space', 'other-message', 0]), false);
  assert.equal(matches(['/entries/effects_by_messages', 'other-space', 'message', 0]), false);
  assert.equal(matches('/entries/effects_by_messages'), false);
});
