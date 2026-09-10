import type { ParseResult } from '@boluo/interpreter';
import type { ComposeCountersState, CounterPreviewPreparation } from './types';
import { prepareStateCommand, stateCommandError } from './prepare-state-command';

export const prepareCounterPreview = (
  parsed: ParseResult,
  {
    source,
    editing,
    loadState,
  }: {
    source: string;
    editing: boolean;
    loadState: ComposeCountersState;
  },
): CounterPreviewPreparation => {
  if (parsed.text !== source) return { type: 'Pending', parsed };
  if (!parsed.stateCommand) return { type: 'NotApplicable', parsed };
  const error = stateCommandError(parsed, editing, true);
  if (error) return { type: 'Error', parsed, error };
  if (loadState.source !== source) return { type: 'Pending', parsed };
  if (loadState.type === 'Unavailable')
    return { type: 'Error', parsed, error: { type: 'MissingCharacter' } };
  if (loadState.type === 'Error') return { type: 'Error', parsed, error: { type: 'LoadFailed' } };
  if (loadState.type !== 'Ready') return { type: 'Pending', parsed };
  return prepareStateCommand(parsed, {
    scopeId: loadState.scopeId,
    entries: loadState.entries,
    mode: 'preview',
  });
};
