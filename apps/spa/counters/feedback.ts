import type { IntlShape } from 'react-intl';
import type { CounterPreviewPreparation, ComposeCountersState, CounterIssue } from './types';

export const counterIssue = (
  preparation: CounterPreviewPreparation,
  loadState: ComposeCountersState,
): CounterIssue | null => {
  if (preparation.type === 'Error') return preparation.error;
  if (preparation.type === 'Pending') return { type: 'LoadingCounters' };
  if (preparation.type === 'Ready') return null;
  if (loadState.type === 'Loading') return { type: 'LoadingCounters' };
  if (loadState.type === 'Error') return { type: 'LoadFailed' };
  if (loadState.type === 'Unavailable') {
    // Without a character, roll expressions retain the parser's ordinary text fallback.
    return null;
  }
  return null;
};

export const counterIssueMessage = (intl: IntlShape, issue: CounterIssue): string => {
  switch (issue.type) {
    case 'LoadingCounters':
      return intl.formatMessage({ defaultMessage: 'Loading counters…' });
    case 'LoadFailed':
      return intl.formatMessage({ defaultMessage: 'Could not load counters. Please try again.' });
    case 'InvalidStateCommand':
      return intl.formatMessage({
        defaultMessage: 'Invalid command. Try .st hp12, .st hp-3, or .st show.',
      });
    case 'EditingCommand':
      return intl.formatMessage({ defaultMessage: 'Send a new message to change counters.' });
    case 'MissingCharacter':
      return intl.formatMessage({ defaultMessage: 'Select a character to use .st commands.' });
    case 'UnknownCounter':
      return intl.formatMessage(
        { defaultMessage: 'Counter “{name}” does not exist.' },
        { name: issue.counterName },
      );
    case 'UnsupportedComponent':
      return intl.formatMessage(
        { defaultMessage: 'Counter “{name}” is unsupported.' },
        { name: issue.counterName },
      );
    case 'InvalidName':
      return intl.formatMessage(
        { defaultMessage: '“{name}” is not a valid counter name.' },
        { name: issue.counterName },
      );
    case 'InvalidNumber':
      return intl.formatMessage(
        { defaultMessage: 'Counter “{name}” requires a safe integer value.' },
        { name: issue.counterName },
      );
  }
};
