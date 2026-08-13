import assert from 'node:assert/strict';
import test from 'node:test';
import {
  selectedPortraitIdForCharacter,
  shouldClearCharacterPortraitSelection,
} from './characterPortraitSelection';

const selection = { characterId: 'character-a', portraitId: 'portrait-a' };

test('returns the selected portrait for its character', () => {
  assert.equal(selectedPortraitIdForCharacter('character-a', selection), 'portrait-a');
});

test('does not reuse a portrait after switching characters', () => {
  assert.equal(selectedPortraitIdForCharacter('character-b', selection), null);
});

test('does not use a portrait without character attribution', () => {
  assert.equal(selectedPortraitIdForCharacter(null, selection), null);
});

test('clears a selected portrait that is no longer available', () => {
  assert.equal(shouldClearCharacterPortraitSelection('character-a', selection, []), true);
  assert.equal(
    shouldClearCharacterPortraitSelection('character-a', selection, ['portrait-a']),
    false,
  );
});
