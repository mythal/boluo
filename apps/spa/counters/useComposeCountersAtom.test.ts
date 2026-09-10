import assert from 'node:assert/strict';
import test from 'node:test';
import type { Character } from '@boluo/api';
import { parseModifiers } from '@boluo/interpreter';
import { resolveCounterTarget } from './useComposeCountersAtom';

const character: Character = {
  id: 'current',
  name: '暁美ほむら',
  key: 'homura',
  aliases: [],
  description: '',
  color: '',
  spaceId: 'space',
  scopeId: 'current-scope',
  ownerId: null,
  accessPolicy: 'PUBLIC',
  accessChannelId: null,
  scopeVersion: '',
  archivedAt: null,
  tags: [],
  created: '',
  modified: '',
  version: '',
};
const original = { ...character, id: 'original', key: 'madoka', scopeId: 'original-scope' };
const resolve = (source: string, originalCharacterId?: string | null, originalInGame = true) => {
  const modifiers = parseModifiers(source);
  return resolveCounterTarget({
    target: modifiers.asTarget,
    channelCharacterId: character.id,
    originalMessageAttribution:
      originalCharacterId === undefined
        ? undefined
        : { characterId: originalCharacterId, inGame: originalInGame },
    defaultInGame: true,
    parsedInGame: modifiers.inGame ? modifiers.inGame.inGame : null,
    characters: [character, original],
  });
};

test('editing inherits the original character until an explicit target overrides it', () => {
  assert.equal(resolve('.r hp').character, character);
  assert.equal(resolve('.r hp', original.id).character, original);
  assert.equal(resolve('.as @; .r hp', original.id).character, character);
  assert.equal(resolve('.as @madoka; .r hp').character, original);
  assert.equal(resolve('.as @; .r hp', null).character, character);
});

test('a custom name has no counter target, while an unresolved reference still needs one', () => {
  assert.deepEqual(resolve('.as Narrator; .r hp'), { hasTarget: false, character: undefined });
  assert.deepEqual(resolve('.r hp', null), { hasTarget: false, character: undefined });
  assert.deepEqual(resolve('.as @missing; .r hp'), { hasTarget: true, character: undefined });
});

test('changing the edited message mode uses the channel counter target instead of the original attribution', () => {
  assert.equal(resolve('.in .r hp', null, false).character, character);
  assert.equal(resolve('.r hp', null, false).hasTarget, false);
  assert.equal(resolve('.out .r hp', null, false).hasTarget, false);
  assert.equal(resolve('.in .r hp', original.id, true).character, original);
  assert.equal(resolve('.out .r hp', original.id, true).character, character);
});
