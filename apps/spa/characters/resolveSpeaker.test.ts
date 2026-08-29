import assert from 'node:assert/strict';
import test from 'node:test';
import type { Character } from '@boluo/api';
import { resolveSpeaker, type Speaker, type SpeakerResolution } from './resolveSpeaker';

const character = {
  id: 'character-1',
  name: 'Alice',
  color: 'preset:orange',
} as Character;

const baseOptions = {
  nickname: 'Player',
  defaultInGame: true,
  parsedInGame: null,
  originalMessageAttribution: undefined,
  channelCharacterId: null,
  channelCharacterName: 'Default Name',
  resolveCharacter: () => ({ status: 'Found' as const, character }),
};

const originalMessageAttribution = {
  characterId: 'original-character',
  portraitId: 'original-portrait',
  name: 'Original Character',
  color: 'preset:blue',
  inGame: true,
};

const resolved = (speaker: Speaker): SpeakerResolution => ({ speaker, issue: null });

test('temporarily overrides and then restores the original message attribution', () => {
  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: null,
      parsedInGame: false,
      originalMessageAttribution,
    }),
    resolved({
      source: 'User',
      name: 'Player',
      inGame: false,
      characterId: null,
    }),
  );

  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: null,
      parsedInGame: true,
      originalMessageAttribution,
    }),
    resolved({
      source: 'Editing',
      ...originalMessageAttribution,
      inGame: true,
    }),
  );

  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: null,
      parsedInGame: false,
      originalMessageAttribution: {
        characterId: null,
        portraitId: null,
        name: 'Original Player',
        color: 'preset:blue',
        inGame: false,
      },
    }),
    resolved({
      source: 'Editing',
      characterId: null,
      portraitId: null,
      name: 'Original Player',
      color: 'preset:blue',
      inGame: false,
    }),
  );

  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: null,
      parsedInGame: true,
      originalMessageAttribution: {
        characterId: null,
        portraitId: null,
        name: 'Player',
        color: 'preset:blue',
        inGame: false,
      },
    }),
    resolved({
      source: 'TemporaryName',
      name: 'Default Name',
      inGame: true,
      characterId: null,
    }),
  );
});

test('resolves temporary names and character references as distinct speakers', () => {
  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: { type: 'TemporaryName', name: 'Alice' },
    }),
    resolved({
      source: 'TemporaryName',
      name: 'Alice',
      inGame: true,
      characterId: null,
    }),
  );
  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: { type: 'CharacterReference', identifier: 'alice' },
      originalMessageAttribution,
    }),
    resolved({
      source: 'Character',
      name: 'Alice',
      inGame: true,
      characterId: 'character-1',
      color: 'preset:orange',
      character,
    }),
  );
});

test('preserves loading state for unresolved character references', () => {
  assert.deepStrictEqual(
    resolveSpeaker({
      ...baseOptions,
      asTarget: { type: 'CharacterReference', identifier: 'alice' },
      resolveCharacter: () => ({ status: 'Loading' }),
    }),
    {
      speaker: {
        source: 'TemporaryName',
        name: 'Default Name',
        inGame: true,
        characterId: null,
      },
      issue: {
        type: 'CharacterReferenceUnavailable',
        identifier: 'alice',
        reason: 'Loading',
      },
    },
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
    resolved({
      source: 'Character',
      name: 'Alice',
      inGame: true,
      characterId: 'character-1',
      color: 'preset:orange',
      character,
    }),
  );
});
