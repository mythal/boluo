import assert from 'node:assert/strict';
import test from 'node:test';
import { checkCompose, composeReducer, makeInitialComposeState } from './compose.reducer';

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

test('restores a failed edit without changing its message id or media', () => {
  const media = new File(['image'], 'image.png', { type: 'image/png' });
  const failedEdit = {
    ...makeInitialComposeState(),
    previewId: 'message-id',
    source: 'edited text',
    media,
    composingAt: 123,
    edit: { time: '2026-08-27T00:00:00.000Z', p: 3, q: 1 },
  };

  const restored = composeReducer(makeInitialComposeState(), {
    type: 'restoreFailedEdit',
    payload: failedEdit,
  });

  assert.equal(restored.previewId, 'message-id');
  assert.equal(restored.source, 'edited text');
  assert.equal(restored.media, media);
  assert.deepEqual(restored.edit, failedEdit.edit);
  assert.equal(restored.composingAt, null);
});

test('keeps the original message attribution while applying speaker overrides', () => {
  const originalMessageAttribution = {
    characterId: null,
    portraitId: null,
    name: 'Original Name',
    color: 'preset:orange',
    inGame: true,
  };
  const state = {
    ...makeInitialComposeState(),
    source: 'hello',
    edit: { time: '2026-08-27T00:00:00.000Z', p: 3, q: 1 },
    originalMessageAttribution,
  };
  assert.equal(checkCompose('', false)(state), null);

  const renamed = composeReducer(state, {
    type: 'setAsTargetText',
    payload: { text: '@character-b', setInGame: true },
  });
  assert.equal(renamed.originalMessageAttribution, originalMessageAttribution);
  assert.equal(renamed.source, '.as @character-b; hello');

  const outOfGame = composeReducer(state, {
    type: 'setInGame',
    payload: { inGame: false },
  });
  assert.equal(outOfGame.originalMessageAttribution, originalMessageAttribution);
  assert.equal(outOfGame.source, '.out hello');

  const restoredInGame = composeReducer(outOfGame, {
    type: 'setInGame',
    payload: { inGame: true },
  });
  assert.equal(restoredInGame.originalMessageAttribution, originalMessageAttribution);
  assert.equal(restoredInGame.source, '.in hello');

  const originalOutOfGame = {
    ...state,
    source: '.in hello',
    originalMessageAttribution: {
      ...originalMessageAttribution,
      name: 'Player',
      inGame: false,
    },
  };
  assert.equal(checkCompose('', false)(originalOutOfGame), 'NO_NAME');
});
