import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareCounterMessage } from './prepare-message';
import type { EntryMaybeCounter } from './types';

test('sending reads current values and versions for both changes and dice references', async () => {
  const entry: EntryMaybeCounter = {
    id: 'hp',
    scopeId: 'scope',
    key: 'hp',
    aliases: [],
    displayName: '',
    referenceNoteId: null,
    tags: [],
    posP: 1,
    posQ: 1,
    pos: 1,
    metadataVersion: 'metadata',
    created: '',
    modified: '',
    counter: {
      payloadType: 'JSON',
      schemaVersion: 1,
      version: 'fresh-version',
      modified: '',
      data: { value: 8 },
    },
  };
  let reads = 0;
  const options = {
    editing: false,
    spaceId: 'space',
    character: { scopeId: 'scope' },
    defaultDiceFace: 20,
    loadEntries: (spaceId: string, scopeId: string) => {
      assert.equal(spaceId, 'space');
      assert.equal(scopeId, 'scope');
      reads++;
      return Promise.resolve([entry]);
    },
  };
  const change = await prepareCounterMessage({ ...options, source: '.st hp-3 mp10' });
  assert.equal(change.type, 'Ready');
  assert.ok(change.batch);
  assert.equal(change.batch.spaceId, 'space');
  assert.equal(change.batch.scopeId, 'scope');
  assert.equal(change.batch.operations.length, 2);
  const update = change.batch.operations[0]!;
  assert.equal(update.type, 'Update');
  assert.deepEqual(update.changes, [
    {
      action: 'SET',
      componentType: 'core/counter',
      expectedVersion: 'fresh-version',
      payloadType: 'JSON',
      schemaVersion: 1,
      data: { value: 5 },
    },
  ]);
  const roll = await prepareCounterMessage({ ...options, source: '.r hp' });
  assert.equal(roll.type, 'Ready');
  assert.equal(roll.batch, null);
  assert.match(JSON.stringify(roll.parsed.entities), /"value":8/);
  assert.equal(reads, 2);
  await prepareCounterMessage({ ...options, source: '.r d20' });
  assert.equal(reads, 2);
});

test('failed counter reads block sending, while ordinary text needs no read', async () => {
  const options = {
    editing: false,
    spaceId: 'space',
    character: { scopeId: 'scope' },
    defaultDiceFace: 20,
    loadEntries: (): Promise<EntryMaybeCounter[]> => Promise.reject(new Error('offline')),
  };
  for (const source of ['.st hp12', '.r hp']) {
    assert.deepEqual(await prepareCounterMessage({ ...options, source }), {
      type: 'Error',
      error: { type: 'LoadFailed' },
    });
  }
  const text = await prepareCounterMessage({ ...options, source: 'hello' });
  assert.equal(text.type, 'Ready');
  assert.equal(text.batch, null);
});

test('command preconditions fail before loading any entries', async () => {
  const options = {
    editing: false,
    spaceId: 'space',
    character: { scopeId: 'scope' },
    defaultDiceFace: 20,
    loadEntries: (): Promise<EntryMaybeCounter[]> => assert.fail('must not load entries'),
  };
  for (const [overrides, error] of [
    [{ source: '.st hp1.5' }, { type: 'InvalidStateCommand' }],
    [{ source: '.st hp12', editing: true }, { type: 'EditingCommand' }],
    [{ source: '.st hp12', character: undefined }, { type: 'MissingCharacter' }],
  ] as const) {
    assert.deepEqual(await prepareCounterMessage({ ...options, ...overrides }), {
      type: 'Error',
      error,
    });
  }
});
