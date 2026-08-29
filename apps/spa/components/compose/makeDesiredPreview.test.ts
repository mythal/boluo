import assert from 'node:assert/strict';
import test from 'node:test';
import { composeInitialParseResult, parse } from '@boluo/interpreter';
import { atom, createStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import type { Character } from '@boluo/api';
import { makeInitialComposeState } from '../../state/compose.reducer';
import {
  areComposePreviewMetadataEqual,
  makeDesiredPreview,
  selectComposePreviewMetadata,
} from './makeDesiredPreview';

test('preview metadata ignores unrelated compose state updates', () => {
  const composeAtom = atom(makeInitialComposeState());
  const metadataAtom = selectAtom(
    composeAtom,
    selectComposePreviewMetadata,
    areComposePreviewMetadataEqual,
  );
  const store = createStore();
  let notifications = 0;
  const unsubscribe = store.sub(metadataAtom, () => {
    notifications += 1;
  });

  const compose = store.get(composeAtom);
  store.set(composeAtom, { ...compose, range: [1, 1], focused: true });
  assert.equal(notifications, 0);

  store.set(composeAtom, { ...store.get(composeAtom), previewId: 'next-preview' });
  assert.equal(notifications, 1);
  unsubscribe();
});

test('does not make a preview from a parse result for an outdated source', () => {
  const compose = {
    ...makeInitialComposeState(),
    previewId: 'new-preview',
    source: 'new source',
  };
  const parsed = {
    ...composeInitialParseResult,
    source: 'old source',
    text: 'old rendered text',
    broadcast: true,
  };

  const desired = makeDesiredPreview({
    channelId: 'channel',
    nickname: 'Alice',
    defaultCharacterName: '',
    defaultInGame: false,
    compose,
    parsed,
  });

  assert.equal(desired, null);
});

test('makes a preview when the parse result matches the current source', () => {
  const compose = {
    ...makeInitialComposeState(),
    previewId: 'current-preview',
    source: 'current source',
  };
  const parsed = {
    ...parse(compose.source),
    source: compose.source,
  };

  const desired = makeDesiredPreview({
    channelId: 'channel',
    nickname: 'Alice',
    defaultCharacterName: '',
    defaultInGame: false,
    compose,
    parsed,
  });

  assert.equal(desired?.preview.id, 'current-preview');
  assert.equal(desired?.preview.text, 'current source');
});

test('uses the resolved character name for a character-reference preview', () => {
  const source = '.as @alice; hello';
  const compose = { ...makeInitialComposeState(), source };
  const parsed = { ...parse(source), source };
  const desired = makeDesiredPreview({
    channelId: 'channel',
    nickname: 'Player',
    defaultCharacterName: '',
    defaultInGame: false,
    compose,
    parsed,
    resolveCharacter: (identifier) =>
      identifier === 'alice'
        ? {
            status: 'Found',
            character: { id: 'character-alice', name: 'Alice' } as Character,
          }
        : { status: 'NotFound' },
  });

  assert.equal(desired?.preview.name, 'Alice');
  assert.equal(desired?.preview.clear, false);
});

test('falls back to the default preview until a character reference resolves', () => {
  const source = '.as @alice; hello';
  const compose = { ...makeInitialComposeState(), source };
  const parsed = { ...parse(source), source };
  const desired = makeDesiredPreview({
    channelId: 'channel',
    nickname: 'Player',
    defaultCharacterName: 'Default Name',
    defaultInGame: false,
    compose,
    parsed,
    resolveCharacter: () => ({ status: 'Loading' }),
  });

  assert.equal(desired?.preview.clear, false);
  assert.equal(desired?.preview.name, 'Default Name');
});

test('makes a cleared preview for the initial empty parse result', () => {
  const compose = makeInitialComposeState();
  const parsed = {
    ...composeInitialParseResult,
    source: compose.source,
  };

  const desired = makeDesiredPreview({
    channelId: 'channel',
    nickname: 'Alice',
    defaultCharacterName: '',
    defaultInGame: false,
    compose,
    parsed,
  });

  assert.equal(desired?.preview.text, '');
  assert.deepEqual(desired?.preview.entities, []);
});

test('hides non-broadcast content in the preview payload', () => {
  const compose = {
    ...makeInitialComposeState(),
    source: 'secret',
  };
  const parsed = {
    ...parse(compose.source),
    source: compose.source,
    broadcast: false,
  };

  const desired = makeDesiredPreview({
    channelId: 'channel',
    nickname: 'Alice',
    defaultCharacterName: '',
    defaultInGame: false,
    compose,
    parsed,
  });

  assert.equal(desired?.preview.text, null);
  assert.deepEqual(desired?.preview.entities, []);
});

test('uses the restored original attribution in an edit preview', () => {
  const originalMessageAttribution = {
    characterId: 'character-a',
    portraitId: 'portrait-a',
    name: 'Character A',
    color: 'preset:orange',
    inGame: true,
  };
  const compose = {
    ...makeInitialComposeState(),
    source: '.in edited text',
    originalMessageAttribution,
  };
  const desired = makeDesiredPreview({
    channelId: 'channel',
    nickname: 'Player',
    defaultCharacterName: 'Character B',
    defaultInGame: false,
    compose,
    parsed: { ...parse(compose.source), source: compose.source },
  });

  assert.equal(desired?.preview.name, 'Character A');
  assert.equal(desired?.preview.inGame, true);
});
