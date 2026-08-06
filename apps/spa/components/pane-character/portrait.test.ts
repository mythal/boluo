import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntryComponentMatch } from '@boluo/api';
import {
  makePortraitAssetName,
  makePortraitDisplayName,
  makePortraitEntryKey,
  parsePortraitComponent,
  reorderPortraitEntries,
  sortPortraitEntries,
} from './portrait';

const portrait = (id: string, pos: number, assetId: string): EntryComponentMatch => ({
  id,
  scopeId: 'scope',
  key: id,
  aliases: [],
  displayName: id,
  referenceNoteId: null,
  tags: [],
  posP: pos,
  posQ: 1,
  pos,
  metadataVersion: `metadata-${id}`,
  created: '2026-08-06T00:00:00Z',
  modified: '2026-08-06T00:00:00Z',
  componentType: 'core/portrait',
  component: {
    payloadType: 'ASSET',
    assetId,
    version: `component-${id}`,
    modified: '2026-08-06T00:00:00Z',
  },
});

test('parses an Asset portrait component', () => {
  assert.deepEqual(parsePortraitComponent(portrait('one', 1, 'asset-one').component), {
    assetId: 'asset-one',
    version: 'component-one',
  });
});

test('rejects a non-Asset portrait component', () => {
  assert.equal(
    parsePortraitComponent({
      payloadType: 'JSON',
      data: null,
      schemaVersion: 1,
      version: 'component-version',
      modified: '2026-08-06T00:00:00Z',
    }),
    null,
  );
});

test('sorts valid portraits by Entry position', () => {
  const later = portrait('later', 20, 'asset-later');
  const earlier = portrait('earlier', 10, 'asset-earlier');
  assert.deepEqual(sortPortraitEntries([later, earlier]), [earlier, later]);
});

test('reorders portraits using the active and target Entry ids', () => {
  const first = portrait('first', 10, 'asset-first');
  const second = portrait('second', 20, 'asset-second');
  const third = portrait('third', 30, 'asset-third');
  assert.deepEqual(
    reorderPortraitEntries([third, first, second], 'first', 'third').map(({ id }) => id),
    ['second', 'third', 'first'],
  );
  assert.deepEqual(
    reorderPortraitEntries([first, second], 'missing', 'second').map(({ id }) => id),
    ['first', 'second'],
  );
});

test('generates a portrait Entry key from local time and random letters', () => {
  const values = [0, 1 / 26, 2 / 26, 3 / 26, 4 / 26, 5 / 26];
  let index = 0;
  assert.equal(
    makePortraitEntryKey(new Date(2026, 7, 7, 0, 59, 47), () => values[index++] ?? 0),
    'portrait-20260807005947-abcdef',
  );
});

test('makes bounded portrait display and Asset names', () => {
  assert.equal(makePortraitDisplayName('Alice'), 'Portrait - Alice');
  assert.equal(Array.from(makePortraitDisplayName('魔'.repeat(40))).length, 32);
  assert.equal(Array.from(makePortraitAssetName('画'.repeat(120), 'Alice')).length, 100);
  assert.equal(makePortraitAssetName('   ', 'Alice'), 'Portrait - Alice');
});
