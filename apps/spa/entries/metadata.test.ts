import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidEntryDisplayName, isValidEntryKey, normalizeEntryDisplayName } from './metadata';

test('validates Entry display names using Unicode length', () => {
  assert.equal(isValidEntryDisplayName(''), true);
  assert.equal(isValidEntryDisplayName('  '), true);
  assert.equal(isValidEntryDisplayName(' P '), true);
  assert.equal(isValidEntryDisplayName('肖像'), true);
  assert.equal(isValidEntryDisplayName('力'), true);
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

test('display name length is checked after NFC normalization', () => {
  assert.equal(isValidEntryDisplayName('e\u0301'), true);
  assert.equal(isValidEntryDisplayName('e\u0301'.repeat(32)), true);
  assert.equal(isValidEntryDisplayName('e\u0301'.repeat(33)), false);
  assert.equal(isValidEntryDisplayName('  Cafe\u0301  '), true);
});

test('display names normalize consistently for validation, comparison, and submission', () => {
  assert.equal(normalizeEntryDisplayName('  Cafe\u0301  '), 'Café');
  assert.equal(normalizeEntryDisplayName('Cafe\u0301'), normalizeEntryDisplayName('Café'));
  assert.equal(normalizeEntryDisplayName('  '), '');
  assert.equal(normalizeEntryDisplayName('Ａ B'), 'Ａ B');
});
