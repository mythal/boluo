import type { ComposeIssue } from '../../state/compose-issues';
import { counterIssueMessage } from '../../counters/feedback';
import { type IntlShape } from 'react-intl';
import { mediaMaxSizeMb } from '../../media';

export interface ComposeFeedbackItem {
  key: string;
  kind: 'error' | 'status';
  message: string;
}

export interface FeedbackPopoverState {
  errorKeys: string[];
  open: boolean;
}

export const updateFeedbackPopover = (
  previous: FeedbackPopoverState,
  items: readonly ComposeFeedbackItem[],
): FeedbackPopoverState => {
  const currentErrorKeys = items.filter((item) => item.kind === 'error').map((item) => item.key);
  // Pending validation does not mean a previously reported error was resolved.
  const errorKeys = items.some((item) => item.kind === 'status')
    ? [...new Set([...previous.errorKeys, ...currentErrorKeys])]
    : currentErrorKeys;
  const hasNewError = currentErrorKeys.some((key) => !previous.errorKeys.includes(key));
  const open = items.length > 0 && (hasNewError || previous.open);
  if (
    open === previous.open &&
    errorKeys.length === previous.errorKeys.length &&
    errorKeys.every((key, index) => key === previous.errorKeys[index])
  )
    return previous;
  return { errorKeys, open };
};

const isPending = (issue: ComposeIssue): boolean =>
  issue.type === 'SENDING' ||
  issue.type === 'LoadingCounters' ||
  (issue.type === 'CharacterReferenceUnavailable' && issue.reason === 'Loading');

const issueKey = (issue: ComposeIssue): string => {
  if (issue.type === 'CharacterReferenceUnavailable') {
    return JSON.stringify([issue.type, issue.identifier, issue.reason]);
  }
  if ('counterName' in issue) return JSON.stringify([issue.type, issue.counterName]);
  return issue.type;
};

export const composeFeedback = (
  intl: IntlShape,
  issues: readonly ComposeIssue[],
): ComposeFeedbackItem[] =>
  issues
    .filter((issue) => issue.type !== 'TEXT_EMPTY')
    .map((issue) => ({
      key: issueKey(issue),
      kind: isPending(issue) ? 'status' : 'error',
      message: composeIssueMessage(intl, issue),
    }));

const composeIssueMessage = (intl: IntlShape, issue: ComposeIssue): string => {
  if (issue.type === 'CharacterReferenceUnavailable') {
    switch (issue.reason) {
      case 'Loading':
        return intl.formatMessage({
          defaultMessage: 'Characters are still loading. Please try again.',
        });
      case 'Error':
        return intl.formatMessage({ defaultMessage: 'Characters could not be loaded.' });
      case 'NotFound':
        return intl.formatMessage(
          { defaultMessage: 'Character “@{identifier}” is unavailable or cannot be portrayed.' },
          { identifier: issue.identifier },
        );
    }
  }
  switch (issue.type) {
    case 'SENDING':
      return intl.formatMessage({ defaultMessage: 'Sending…' });
    case 'TEXT_EMPTY':
      return intl.formatMessage({ defaultMessage: 'Message cannot be empty.' });
    case 'NO_NAME':
      return intl.formatMessage({
        defaultMessage: 'Sending an in-game message requires a character name.',
      });
    case 'MEDIA_TOO_LARGE':
      return intl.formatMessage(
        { defaultMessage: 'File size must be less than {sizeLimit}M.' },
        { sizeLimit: mediaMaxSizeMb },
      );
    case 'MEDIA_TYPE_NOT_SUPPORTED':
      return intl.formatMessage({ defaultMessage: 'Unsupported media type.' });
    default:
      return counterIssueMessage(intl, issue);
  }
};
