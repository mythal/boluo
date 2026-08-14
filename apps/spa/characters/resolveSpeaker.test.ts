import assert from 'node:assert/strict';
import test from 'node:test';
import type { Character } from '@boluo/api';
import { resolveSpeaker } from './resolveSpeaker';

const character = {
  id: 'character-1',
  name: 'Alice',
  color: 'preset:orange',
} as Character;

const baseOptions = {
  nickname: 'Player',
  defaultInGame: true,
  parsedInGame: null,
  editingAttribution: undefined,
  channelCharacterId: null,
  channelCharacterName: 'Default Name',
  resolveCharacter: () => ({ status: 'Found' as const, character }),
};

test('resolves temporary names and character references as distinct speakers', () => {
  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: { type: 'TemporaryName', name: 'Alice' },
    }),
    {
      type: 'Resolved',
      source: 'TemporaryName',
      name: 'Alice',
      inGame: true,
      characterId: null,
    },
  );
  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: { type: 'CharacterReference', identifier: 'alice' },
    }),
    {
      type: 'Resolved',
      source: 'Character',
      name: 'Alice',
      inGame: true,
      characterId: 'character-1',
      color: 'preset:orange',
      character,
    },
  );
});

test('preserves loading state for unresolved character references', () => {
  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: { type: 'CharacterReference', identifier: 'alice' },
      resolveCharacter: () => ({ status: 'Loading' }),
    }),
    { type: 'InvalidCharacterReference', identifier: 'alice', reason: 'Loading' },
  );
});

test('uses the channel character for a default character target', () => {
  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: { type: 'DefaultCharacter' },
      channelCharacterId: character.id,
      channelCharacterName: character.name,
      channelCharacter: character,
    }),
    {
      type: 'Resolved',
      source: 'Character',
      name: 'Alice',
      inGame: true,
      characterId: 'character-1',
      color: 'preset:orange',
      character,
    },
  );
});
