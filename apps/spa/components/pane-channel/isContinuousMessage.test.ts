import assert from 'node:assert/strict';
import test from 'node:test';
import type { MessageItem } from '../../state/channel.types';
import { isContinuousMessage } from './isContinuousMessage';

const message = (overrides: Partial<MessageItem> = {}): MessageItem =>
  ({
    type: 'MESSAGE',
    senderId: 'user-a',
    name: 'Character A',
    characterId: 'character-a',
    portraitId: 'portrait-a',
    ...overrides,
  }) as MessageItem;

test('messages with the same character and portrait are continuous', () => {
  assert.equal(isContinuousMessage(message(), message()), true);
});

test('a character change breaks message continuity', () => {
  assert.equal(isContinuousMessage(message(), message({ characterId: 'character-b' })), false);
});

test('a portrait change breaks message continuity', () => {
  assert.equal(isContinuousMessage(message(), message({ portraitId: 'portrait-b' })), false);
});

test('null and omitted character attribution are treated equally', () => {
  assert.equal(
    isContinuousMessage(
      message({ characterId: null, portraitId: null }),
      message({ characterId: undefined, portraitId: undefined }),
    ),
    true,
  );
});
