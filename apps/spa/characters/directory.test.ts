import assert from 'node:assert/strict';
import test from 'node:test';
import type { Character } from '@boluo/api';
import {
  createCharacterDirectory,
  resolveCharacterIdentifier,
  suggestCharacters,
} from './directory';

const character = {
  id: 'character-1',
  name: 'Alice',
  key: 'alice_pc',
  aliases: ['alice'],
  archivedAt: null,
} as Character;
const directory = createCharacterDirectory([character]);

test('resolves character identifiers by key and alias without case sensitivity', () => {
  assert.strictEqual(resolveCharacterIdentifier('ALICE_PC', directory), character);
  assert.strictEqual(resolveCharacterIdentifier('Alice', directory), character);
  assert.strictEqual(resolveCharacterIdentifier('unknown', directory), null);
});

test('suggests a character for an exact name, key, or alias match', () => {
  assert.deepStrictEqual(suggestCharacters('Alice', directory), [character]);
  assert.deepStrictEqual(suggestCharacters('alice_pc', directory), [character]);
  assert.deepStrictEqual(suggestCharacters('Ali', directory), []);
});
