import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore } from 'jotai/vanilla';
import {
  normalizeRecentCharacterIds,
  recentCharacterIdsAtomFamily,
  recordRecentCharacterId,
  selectRecentCharacters,
} from './recentCharacters';

test('records character use in most-recent-first order', () => {
  const afterFirstUse = recordRecentCharacterId([], 'character-a');
  const afterSecondUse = recordRecentCharacterId(afterFirstUse, 'character-b');
  const afterThirdUse = recordRecentCharacterId(afterSecondUse, 'character-a');

  assert.deepEqual(afterThirdUse, ['character-a', 'character-b']);
});

test('normalizes stored character ids', () => {
  assert.deepEqual(normalizeRecentCharacterIds(['character-a', '', null, 'character-a']), [
    'character-a',
  ]);
  assert.deepEqual(normalizeRecentCharacterIds({}), []);
});

test('shares recent character state per user and space', () => {
  const store = createStore();
  const firstReference = recentCharacterIdsAtomFamily({ spaceId: 'space-a', userId: 'user-a' });
  const secondReference = recentCharacterIdsAtomFamily({ spaceId: 'space-a', userId: 'user-a' });
  const otherUser = recentCharacterIdsAtomFamily({ spaceId: 'space-a', userId: 'user-b' });

  store.set(firstReference, 'character-a');

  assert.deepEqual(store.get(secondReference), ['character-a']);
  assert.deepEqual(store.get(otherUser), []);
});

test('shows used characters first and fills the recent list with owned characters', () => {
  const characters = [
    { id: 'owned-newer', ownerId: 'me' },
    { id: 'other-unused', ownerId: 'someone-else' },
    { id: 'owned-used', ownerId: 'me' },
    { id: 'other-used', ownerId: 'someone-else' },
    { id: 'owned-older', ownerId: 'me' },
  ];

  assert.deepEqual(
    selectRecentCharacters(characters, 'me', ['other-used', 'owned-used'], 5).map(({ id }) => id),
    ['other-used', 'owned-used', 'owned-newer', 'owned-older'],
  );
});

test('initial recent list only contains owned characters in server order', () => {
  const characters = [
    { id: 'other-newer', ownerId: 'someone-else' },
    { id: 'owned-newer', ownerId: 'me' },
    { id: 'owned-older', ownerId: 'me' },
  ];

  assert.deepEqual(
    selectRecentCharacters(characters, 'me', [], 1).map(({ id }) => id),
    ['owned-newer'],
  );
});

test('falls back to server order when there are no used or owned characters', () => {
  const characters = [
    { id: 'other-newer', ownerId: 'someone-else' },
    { id: 'other-older', ownerId: 'someone-else' },
  ];

  assert.deepEqual(
    selectRecentCharacters(characters, 'me', [], 1).map(({ id }) => id),
    ['other-newer'],
  );
});

test('includes the required character without exceeding the recent limit', () => {
  const characters = [
    { id: 'recent', ownerId: 'me' },
    { id: 'default', ownerId: 'someone-else' },
    { id: 'owned', ownerId: 'me' },
  ];

  assert.deepEqual(
    selectRecentCharacters(characters, 'me', ['recent'], 2, 'default').map(({ id }) => id),
    ['recent', 'default'],
  );
});

test('preserves the server-order fallback when the required character is present', () => {
  const characters = [
    { id: 'other-newer', ownerId: 'someone-else' },
    { id: 'default', ownerId: 'someone-else' },
    { id: 'other-older', ownerId: 'someone-else' },
  ];

  assert.deepEqual(
    selectRecentCharacters(characters, 'me', [], 3, 'default').map(({ id }) => id),
    ['other-newer', 'default', 'other-older'],
  );
});
