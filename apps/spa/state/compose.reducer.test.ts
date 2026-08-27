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
