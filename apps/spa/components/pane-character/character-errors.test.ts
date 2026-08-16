import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CharacterIdentifierConflictError,
  CharacterStaleError,
  toCharacterMutationError,
} from './character-errors';

const intl = {
  formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
};

test('maps character conflicts to actionable errors', () => {
  const identifierConflict = toCharacterMutationError(intl, {
    code: 'CONFLICT',
    message: 'Resource already exists',
    context: 'character_identifiers',
  });
  assert.ok(identifierConflict instanceof CharacterIdentifierConflictError);

  const staleConflict = toCharacterMutationError(intl, {
    code: 'CONFLICT',
    message: 'Resource already exists',
    context: 'Character version is stale',
  });
  assert.ok(staleConflict instanceof CharacterStaleError);
  assert.match(staleConflict.message, /updated elsewhere/);
});

test('explains transport errors instead of exposing error codes', () => {
  const error = toCharacterMutationError(intl, {
    code: 'FETCH_FAIL',
    cause: new Error('offline'),
  });
  assert.equal(error.message, 'Request failed, possible network anomaly.');
});
