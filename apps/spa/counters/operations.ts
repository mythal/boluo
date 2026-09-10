import { Ok, Err, type Result } from '@boluo/utils/result';
import type { EntryMaybeCounter, CounterMutationPlan, CounterOperationError } from './types';
import type {
  EntryComponentMatch,
  EntryMetadata,
  EntryComponent,
  ComponentChangePreview,
  ComponentPayload,
  ComponentSnapshot,
} from '@boluo/api';
import {
  normalizeVariableLookupKey,
  type StateCommand,
  type StateAssignment,
  type VariableLookupKey,
  type Variables,
} from '@boluo/interpreter';
import { isValidEntryKey } from '../entries/metadata';
import { readCounterPayload } from '@boluo/components/counter';

export const mergeCounterEntries = (
  entries: readonly EntryMetadata[],
  counters: readonly EntryComponentMatch[],
): EntryMaybeCounter[] => {
  const components = new Map(counters.map((entry) => [entry.id, entry.component]));
  return entries.map((entry) => ({ ...entry, counter: components.get(entry.id) }));
};

export const findCounterEntry = (
  entries: readonly EntryMaybeCounter[],
  name: string,
): EntryMaybeCounter | undefined => {
  const identifier = normalizeVariableLookupKey(name);
  return entries.find((entry) =>
    [entry.key, ...entry.aliases].some((name) => normalizeVariableLookupKey(name) === identifier),
  );
};

export const buildVariableEnv = (entries: readonly EntryMaybeCounter[]): Variables => {
  const variables: Partial<Record<VariableLookupKey, number>> = Object.create(null) as Partial<
    Record<VariableLookupKey, number>
  >;
  for (const entry of entries) {
    const counter = readCounterPayload(entry.counter ?? null);
    if (counter == null) continue;
    for (const name of [entry.key, ...entry.aliases])
      variables[normalizeVariableLookupKey(name)] = counter.value;
  }
  return variables;
};

const extractPayload = (component: EntryComponent | undefined): ComponentPayload | null => {
  if (component == null) return null;
  if (component.payloadType === 'ASSET')
    return { payloadType: 'ASSET', assetId: component.assetId };
  return { payloadType: 'JSON', schemaVersion: component.schemaVersion, data: component.data };
};

const planCounterMutation = (
  scopeId: string,
  command: StateAssignment | Extract<StateCommand, { type: 'Remove' }>,
  entry: EntryMaybeCounter | undefined,
  previous: CounterMutationPlan | undefined,
): Result<CounterMutationPlan, CounterOperationError> => {
  const name = command.name.trim().normalize('NFC');
  if (!isValidEntryKey(name)) return new Err({ type: 'InvalidName', counterName: name });
  const before = extractPayload(entry?.counter);
  const current = previous ? previous.change.after : before;
  const counter = readCounterPayload(current);
  if (current != null && counter == null)
    return new Err({ type: 'UnsupportedComponent', counterName: name });
  if (command.type !== 'Set' && counter == null)
    return new Err({ type: 'UnknownCounter', counterName: name });

  let after: ComponentPayload | null = null;
  if (command.type !== 'Remove') {
    if (!Number.isSafeInteger(command.value))
      return new Err({ type: 'InvalidNumber', counterName: name });
    const value = command.type === 'Adjust' ? counter!.value + command.value : command.value;
    if (!Number.isSafeInteger(value)) return new Err({ type: 'InvalidNumber', counterName: name });
    after = { payloadType: 'JSON', schemaVersion: 1, data: { ...counter?.data, value } };
  }

  const change: ComponentChangePreview = {
    component: {
      entryId: entry?.id ?? null,
      scopeId,
      key: entry?.key ?? previous?.change.component.key ?? name,
      componentType: 'core/counter',
    },
    displayName: entry?.displayName ?? '',
    before,
    after,
  };
  if (entry == null) {
    return new Ok({
      change,
      operation: {
        type: 'Create',
        key: change.component.key,
        aliases: [],
        displayName: '',
        referenceNoteId: null,
        components: { 'core/counter': after! },
      },
    });
  }
  return new Ok({
    change,
    operation: {
      type: 'Update',
      entryId: entry.id,
      changes: [
        after == null
          ? {
              action: 'REMOVE',
              componentType: 'core/counter',
              expectedVersion: entry.counter?.version ?? null,
            }
          : {
              action: 'SET',
              componentType: 'core/counter',
              expectedVersion: entry.counter?.version ?? null,
              ...after,
            },
      ],
    },
  });
};

export const planCounterMutations = (
  scopeId: string,
  command: Exclude<StateCommand, { type: 'Show' }>,
  entries: readonly EntryMaybeCounter[],
): Result<CounterMutationPlan[], CounterOperationError> => {
  const plans = new Map<string, CounterMutationPlan>();
  const operations = command.type === 'Update' ? command.assignments : [command];
  for (const operation of operations) {
    const entry = findCounterEntry(entries, operation.name);
    const key = entry?.id ?? `new:${normalizeVariableLookupKey(operation.name)}`;
    const result = planCounterMutation(scopeId, operation, entry, plans.get(key));
    if (!result.isOk) return result;
    plans.set(key, result.some);
  }
  return new Ok([...plans.values()]);
};

export const counterSnapshot = (
  entries: readonly EntryMaybeCounter[],
  name?: string,
): Result<ComponentSnapshot[], CounterOperationError> => {
  const selected = name
    ? [findCounterEntry(entries, name)]
    : entries.filter((entry) => entry.counter != null).sort((a, b) => a.pos - b.pos);
  const snapshots: ComponentSnapshot[] = [];
  for (const entry of selected) {
    if (!entry?.counter) return new Err({ type: 'UnknownCounter', counterName: name ?? '' });
    const component = entry.counter;
    if (component.payloadType !== 'JSON' || readCounterPayload(component) == null)
      return new Err({ type: 'UnsupportedComponent', counterName: entry.key });
    snapshots.push({
      component: {
        entryId: entry.id,
        scopeId: entry.scopeId,
        key: entry.key,
        componentType: 'core/counter',
      },
      displayName: entry.displayName,
      payload: {
        payloadType: 'JSON',
        schemaVersion: component.schemaVersion,
        data: component.data,
      },
    });
  }
  return new Ok(snapshots);
};
