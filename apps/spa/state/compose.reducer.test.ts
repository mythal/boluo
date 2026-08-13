import assert from 'node:assert/strict';
import test from 'node:test';
import { composeReducer, makeInitialComposeState } from './compose.reducer';

test('selects and clears a character portrait', () => {
  const selection = { characterId: 'character-a', portraitId: 'portrait-a' };
  const selected = composeReducer(makeInitialComposeState(), {
    type: 'selectCharacterPortrait',
    payload: selection,
  });
  assert.deepEqual(selected.selectedCharacterPortrait, selection);

  const cleared = composeReducer(selected, {
    type: 'selectCharacterPortrait',
    payload: null,
  });
  assert.equal(cleared.selectedCharacterPortrait, null);
});
