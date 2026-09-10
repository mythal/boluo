import type { PreparedCounterMessage, EntryMaybeCounter } from './types';
import type { Character } from '@boluo/api';
import { needsVariableEnvironment, parse } from '@boluo/interpreter';
import { buildVariableEnv } from './operations';
import { prepareStateCommand, stateCommandError } from './prepare-state-command';

// Reload counters before sending because preview data may be stale.
export const prepareCounterMessage = async ({
  source,
  editing,
  spaceId,
  character,
  defaultDiceFace,
  loadEntries,
}: {
  source: string;
  editing: boolean;
  spaceId: string;
  character: Pick<Character, 'scopeId'> | undefined;
  defaultDiceFace: number;
  loadEntries: (spaceId: string, scopeId: string) => Promise<EntryMaybeCounter[]>;
}): Promise<PreparedCounterMessage> => {
  const initial = parse(source, { defaultDiceFace });
  const error = stateCommandError(initial, editing, character != null);
  if (error) return { type: 'Error', error };
  if (!character || !needsVariableEnvironment(source))
    return { type: 'Ready', parsed: initial, batch: null };
  let entries: EntryMaybeCounter[];
  try {
    entries = await loadEntries(spaceId, character.scopeId);
  } catch {
    return { type: 'Error', error: { type: 'LoadFailed' } };
  }
  const parsed = initial.stateCommand
    ? initial
    : parse(source, {
        defaultDiceFace,
        variables: buildVariableEnv(entries),
      });
  const prepared = prepareStateCommand(parsed, {
    mode: 'message',
    scopeId: character.scopeId,
    entries,
  });
  switch (prepared.type) {
    case 'Ready':
      return {
        type: 'Ready',
        parsed: prepared.parsed,
        batch:
          prepared.plans.length === 0
            ? null
            : {
                spaceId,
                scopeId: character.scopeId,
                operations: prepared.plans.map(({ operation }) => operation),
              },
      };
    case 'Error':
      return prepared;
    case 'NotApplicable':
      return { type: 'Ready', parsed, batch: null };
  }
};
