import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldCheckCharacterIdentifier } from './character-edit-validation';

test('only checks new or changed character identifiers', () => {
  assert.equal(shouldCheckCharacterIdentifier('existing', 'existing'), false);
  assert.equal(shouldCheckCharacterIdentifier(' existing ', 'existing'), false);
  assert.equal(shouldCheckCharacterIdentifier('changed', 'existing'), true);
  assert.equal(shouldCheckCharacterIdentifier('new', null), true);
});
