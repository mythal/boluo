import type {
  StateCommandError,
  StateCommandPreparation,
  CounterMutationPlan,
  EntryMaybeCounter,
} from './types';
import type { ComponentReport } from '@boluo/api';
import type { ParseResult } from '@boluo/interpreter';
import { planCounterMutations, counterSnapshot } from './operations';

export const stateCommandError = (
  parsed: ParseResult,
  editing: boolean,
  hasCharacter: boolean,
): StateCommandError | null => {
  if (!parsed.stateCommand) return null;
  if (parsed.stateCommand.diagnostic) return parsed.stateCommand.diagnostic;
  if (editing) return { type: 'EditingCommand' };
  if (!hasCharacter) return { type: 'MissingCharacter' };
  return null;
};

export const prepareStateCommand = (
  parsed: ParseResult,
  {
    entries,
    scopeId,
    mode,
  }: {
    entries: readonly EntryMaybeCounter[];
    scopeId: string;
    mode: 'preview' | 'message';
  },
): StateCommandPreparation => {
  const syntax = parsed.stateCommand;
  if (!syntax) return { type: 'NotApplicable', parsed };
  if (syntax.diagnostic) return { type: 'Error', parsed, error: syntax.diagnostic };

  const command = syntax.command;
  let plans: CounterMutationPlan[] = [];
  let report: ComponentReport;
  if (command.type === 'Show') {
    const result = counterSnapshot(entries, command.name);
    if (!result.isOk) return { type: 'Error', parsed, error: result.err };
    report = { type: 'Snapshot', items: result.some };
  } else {
    const result = planCounterMutations(scopeId, command, entries);
    if (!result.isOk) return { type: 'Error', parsed, error: result.err };
    plans = result.some;
    report =
      mode === 'preview'
        ? { type: 'ChangePreview', items: plans.map(({ change }) => change) }
        : { type: 'Change', items: plans.map(({ change }) => change.component) };
  }
  const start = syntax.prefix.start;
  return {
    type: 'Ready',
    parsed: {
      ...parsed,
      entities: [{ type: 'ComponentReport', start, len: parsed.text.length - start, report }],
    },
    plans,
  };
};
