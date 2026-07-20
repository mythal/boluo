import assert from 'node:assert/strict';
import test from 'node:test';
import { composeInitialParseResult, parse } from '@boluo/interpreter';
import { atom, createStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
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
