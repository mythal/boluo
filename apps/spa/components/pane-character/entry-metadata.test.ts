import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidEntryDisplayName, isValidEntryKey } from './entry-metadata';

test('validates Entry display names using Unicode length', () => {
  assert.equal(isValidEntryDisplayName(' P '), false);
  assert.equal(isValidEntryDisplayName('肖像'), true);
  assert.equal(isValidEntryDisplayName('😀'.repeat(32)), true);
  assert.equal(isValidEntryDisplayName('😀'.repeat(33)), false);
});

test('validates Entry keys using server identifier rules', () => {
  assert.equal(isValidEntryKey('portrait-123-abcdef'), true);
  assert.equal(isValidEntryKey('肖像:正面'), true);
  assert.equal(isValidEntryKey('contains spaces'), false);
  assert.equal(isValidEntryKey(''), false);
  assert.equal(isValidEntryKey('x'.repeat(65)), false);
});
