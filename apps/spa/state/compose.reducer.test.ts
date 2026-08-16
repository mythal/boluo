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

test('keeps a referenced character after sending when it is not the default', () => {
  const state = { ...makeInitialComposeState(), source: '.as @alice; hello' };
  const sent = composeReducer(state, {
    type: 'sent',
    payload: { collapseCharacterReference: false },
  });

  assert.equal(sent.source, '.as @alice; ');
});

test('omits a referenced character after sending when it is the default', () => {
  const state = { ...makeInitialComposeState(), source: '.as @alice; hello' };
  const sent = composeReducer(state, {
    type: 'sent',
    payload: { collapseCharacterReference: true },
  });

  assert.equal(sent.source, '.as ');
});

test('omits an explicit default-character target after sending', () => {
  const state = { ...makeInitialComposeState(), source: '.as @; hello' };
  const sent = composeReducer(state, { type: 'sent', payload: {} });

  assert.equal(sent.source, '.as ');
});
