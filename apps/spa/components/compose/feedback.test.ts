import assert from 'node:assert/strict';
import test from 'node:test';
import { createIntl } from 'react-intl';
import { composeFeedback, updateFeedbackPopover } from './feedback';
import type { ComposeIssue } from '../../state/compose-issues';

const baseIntl = createIntl({ locale: 'en' });
const intl = {
  ...baseIntl,
  formatMessage: ((message, values, options) =>
    baseIntl.formatMessage(
      {
        ...message,
        id:
          message.id ??
          (typeof message.defaultMessage === 'string' ? message.defaultMessage : 'test'),
      },
      values,
      options,
    )) as typeof baseIntl.formatMessage,
};

test('feedback keeps simultaneous errors and distinguishes pending states from errors', () => {
  const items = composeFeedback(intl, [
    { type: 'TEXT_EMPTY' },
    { type: 'NO_NAME' },
    { type: 'MissingCharacter' },
    { type: 'LoadingCounters' },
    { type: 'CharacterReferenceUnavailable', identifier: 'hero', reason: 'Loading' },
    { type: 'SENDING' },
  ]);
  assert.deepEqual(
    items.map(({ kind }) => kind),
    ['error', 'error', 'status', 'status', 'status'],
  );
  assert.equal(new Set(items.map(({ key }) => key)).size, items.length);
  assert.ok(items.every(({ message }) => message.length > 0));
});

test('error identity distinguishes references and survives translated message changes', () => {
  const issues: ComposeIssue[] = [
    { type: 'UnknownCounter', counterName: 'hp' },
    { type: 'UnknownCounter', counterName: 'mp' },
    { type: 'CharacterReferenceUnavailable', identifier: 'hero', reason: 'NotFound' },
    { type: 'CharacterReferenceUnavailable', identifier: 'hero', reason: 'Error' },
  ];
  const items = composeFeedback(intl, issues);
  const translated = composeFeedback(
    {
      ...intl,
      formatMessage: ((descriptor, values, options) =>
        intl.formatMessage(
          { ...descriptor, defaultMessage: 'Translated message' },
          values,
          options,
        )) as typeof intl.formatMessage,
    },
    issues,
  );
  assert.equal(new Set(items.map(({ key }) => key)).size, issues.length);
  assert.deepEqual(
    items.map(({ key }) => key),
    translated.map(({ key }) => key),
  );
  assert.ok(items.every(({ kind }) => kind === 'error'));
});

test('dismissed errors stay closed through pending validation, but new or resolved errors can reopen', () => {
  const hpError: ComposeIssue = { type: 'UnknownCounter', counterName: 'hp' };
  const mpError: ComposeIssue = { type: 'UnknownCounter', counterName: 'mp' };
  const feedback = (...issues: ComposeIssue[]) => composeFeedback(intl, issues);
  let state = updateFeedbackPopover({ errorKeys: [], open: false }, feedback(hpError));
  assert.equal(state.open, true);
  state = { ...state, open: false };
  state = updateFeedbackPopover(state, feedback({ type: 'LoadingCounters' }));
  assert.equal(state.open, false);
  state = updateFeedbackPopover(state, feedback(hpError));
  assert.equal(state.open, false);
  state = updateFeedbackPopover(state, feedback(hpError, mpError));
  assert.equal(state.open, true);
  state = { ...state, open: false };
  state = updateFeedbackPopover(state, feedback(hpError));
  assert.equal(state.open, false);
  state = updateFeedbackPopover(state, feedback());
  assert.equal(state.open, false);
  state = updateFeedbackPopover(state, feedback(hpError));
  assert.equal(state.open, true);
});
