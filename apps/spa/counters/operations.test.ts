import { Err } from '@boluo/utils/result';
import type { EntryMaybeCounter } from './types';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeVariableLookupKey,
  type StateAssignment,
  type StateCommand,
} from '@boluo/interpreter';
import {
  buildVariableEnv,
  planCounterMutations,
  mergeCounterEntries,
  counterSnapshot,
} from './operations';

const hp = {
  id: 'entry',
  scopeId: 'scope',
  key: 'hp',
  aliases: ['血量'],
  displayName: 'Hit Points',
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
    version: 'counter-version',
    modified: '',
    data: { value: 12, max: 20, extra: 'preserve' },
  },
} satisfies EntryMaybeCounter;

const planCounterMutation = (
  scopeId: string,
  command: StateAssignment | Extract<StateCommand, { type: 'Remove' }>,
  entries: readonly EntryMaybeCounter[],
) =>
  planCounterMutations(
    scopeId,
    command.type === 'Remove' ? command : { type: 'Update', assignments: [command] },
    entries,
  ).map((plans) => plans[0]!.operation);

test('aliases share a value and changing a value preserves unrelated JSON and the precondition', () => {
  assert.equal(buildVariableEnv([hp])[normalizeVariableLookupKey('血量')], 12);
  const plan = planCounterMutation('scope', { type: 'Adjust', name: '血量', value: -15 }, [
    hp,
  ]).unwrap();
  assert.ok(plan.type === 'Update');
  assert.equal(plan.entryId, hp.id);
  assert.deepEqual(plan.changes, [
    {
      action: 'SET',
      componentType: 'core/counter',
      expectedVersion: 'counter-version',
      payloadType: 'JSON',
      schemaVersion: 1,
      data: { value: -3, max: 20, extra: 'preserve' },
    },
  ]);
  assert.equal(buildVariableEnv([hp])[normalizeVariableLookupKey('hp')], 12);
});

test('deletion only removes the number component', () => {
  const plan = planCounterMutation('scope', { type: 'Remove', name: 'HP' }, [hp]).unwrap();
  assert.ok(plan.type === 'Update');
  assert.deepEqual(plan.changes, [
    { action: 'REMOVE', componentType: 'core/counter', expectedVersion: 'counter-version' },
  ]);
});

test('new counters leave display names empty and retain their full keys', () => {
  for (const name of ['力', 'a', '😀', 'hp', 'x'.repeat(64)]) {
    const plan = planCounterMutation('scope', { type: 'Set', name, value: 12 }, []).unwrap();
    assert.ok(plan.type === 'Create');
    assert.equal(plan.key, name);
    assert.equal(plan.displayName, '');
    assert.deepEqual(plan.components, {
      'core/counter': { payloadType: 'JSON', schemaVersion: 1, data: { value: 12 } },
    });
  }
});

test('adjusting an unknown counter fails', () => {
  assert.deepEqual(
    planCounterMutation('scope', { type: 'Adjust', name: 'hp', value: -1 }, []),
    new Err({ type: 'UnknownCounter', counterName: 'hp' }),
  );
});

test('unsupported schemas cannot be referenced, displayed as counters or overwritten', () => {
  const unsupported = {
    ...hp,
    counter: {
      ...hp.counter,
      payloadType: 'JSON' as const,
      schemaVersion: 2,
      data: { value: 12 },
    },
  };
  assert.equal(buildVariableEnv([unsupported])[normalizeVariableLookupKey('hp')], undefined);
  assert.deepEqual(
    counterSnapshot([unsupported]),
    new Err({ type: 'UnsupportedComponent', counterName: 'hp' }),
  );
  assert.deepEqual(
    planCounterMutation('scope', { type: 'Set', name: 'hp', value: 1 }, [unsupported]),
    new Err({ type: 'UnsupportedComponent', counterName: 'hp' }),
  );
});

test('writes require safe integers while reading existing decimals remains supported', () => {
  for (const value of [1.5, Number.MAX_SAFE_INTEGER + 1, Infinity]) {
    assert.deepEqual(
      planCounterMutation('scope', { type: 'Set', name: 'hp', value }, [hp]),
      new Err({ type: 'InvalidNumber', counterName: 'hp' }),
    );
  }
  const entry = (value: number): EntryMaybeCounter => ({
    ...hp,
    counter: {
      ...hp.counter,
      payloadType: 'JSON',
      schemaVersion: 1,
      data: { value, min: -0.5, max: 20.5 },
    },
  });
  assert.equal(buildVariableEnv([entry(1.5)])[normalizeVariableLookupKey('hp')], 1.5);
  assert.deepEqual(
    planCounterMutation('scope', { type: 'Adjust', name: 'hp', value: 1 }, [
      entry(Number.MAX_SAFE_INTEGER),
    ]),
    new Err({ type: 'InvalidNumber', counterName: 'hp' }),
  );
  assert.deepEqual(
    planCounterMutation('scope', { type: 'Adjust', name: 'hp', value: 0.5 }, [entry(1.5)]),
    new Err({ type: 'InvalidNumber', counterName: 'hp' }),
  );
});

test('multiple assignments accumulate by entry and alias, using one original version lock', () => {
  const plans = planCounterMutations(
    'scope',
    {
      type: 'Update',
      assignments: [
        { type: 'Adjust', name: 'HP', value: -3 },
        { type: 'Set', name: 'mp', value: 10 },
        { type: 'Adjust', name: '血量', value: -2 },
        { type: 'Adjust', name: 'MP', value: 1 },
      ],
    },
    [hp],
  ).unwrap();
  assert.equal(plans.length, 2);
  const [health, magic] = plans;
  assert.ok(health && magic);
  assert.deepEqual(health.change.before, {
    payloadType: 'JSON',
    schemaVersion: 1,
    data: { value: 12, max: 20, extra: 'preserve' },
  });
  assert.deepEqual(health.change.after, {
    payloadType: 'JSON',
    schemaVersion: 1,
    data: { value: 7, max: 20, extra: 'preserve' },
  });
  assert.equal(health.change.component.entryId, hp.id);
  assert.ok(health.operation.type === 'Update');
  assert.deepEqual(health.operation.changes, [
    {
      action: 'SET',
      componentType: 'core/counter',
      expectedVersion: 'counter-version',
      payloadType: 'JSON',
      schemaVersion: 1,
      data: { value: 7, max: 20, extra: 'preserve' },
    },
  ]);
  assert.ok(magic.operation.type === 'Create');
  assert.equal(magic.operation.key, 'mp');
  assert.deepEqual(magic.operation.components, {
    'core/counter': { payloadType: 'JSON', schemaVersion: 1, data: { value: 11 } },
  });
  assert.equal(magic.change.component.entryId, null);
  assert.deepEqual(magic.change.after, {
    payloadType: 'JSON',
    schemaVersion: 1,
    data: { value: 11 },
  });
  assert.equal(buildVariableEnv([hp])[normalizeVariableLookupKey('hp')], 12);
});

test('metadata-only entries are restored without creating a duplicate entry', () => {
  const entries = mergeCounterEntries([hp], []);
  const [plan] = planCounterMutations(
    'scope',
    {
      type: 'Update',
      assignments: [{ type: 'Set', name: '血量', value: 5 }],
    },
    entries,
  ).unwrap();
  assert.ok(plan?.operation.type === 'Update');
  assert.equal(plan.operation.entryId, hp.id);
  assert.equal(plan.operation.changes[0]?.expectedVersion, null);
  assert.equal(plan.change.before, null);
});

test('snapshot uses entry order and aliases, preserving payloads without live component metadata', () => {
  const later = { ...hp, id: 'later', key: 'mp', aliases: [], pos: 2 };
  const empty = { ...hp, id: 'empty', key: 'empty', aliases: [], counter: undefined };
  const entries = [later, empty, hp];
  assert.deepEqual(
    counterSnapshot(entries)
      .unwrap()
      .map((item) => item.component.key),
    ['hp', 'mp'],
  );
  assert.deepEqual(
    counterSnapshot(entries, 'missing'),
    new Err({ type: 'UnknownCounter', counterName: 'missing' }),
  );
  const [snapshot] = counterSnapshot(entries, '血量').unwrap();
  assert.deepEqual(snapshot, {
    component: { entryId: hp.id, scopeId: 'scope', key: 'hp', componentType: 'core/counter' },
    displayName: hp.displayName,
    payload: {
      payloadType: 'JSON',
      schemaVersion: 1,
      data: { value: 12, max: 20, extra: 'preserve' },
    },
  });
  assert.equal(entries[0], later);
});
