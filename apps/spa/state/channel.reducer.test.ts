/* eslint-disable @typescript-eslint/no-floating-promises */
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import type { Message, Preview } from '@boluo/api';
import * as L from 'list';
import type { ChatReducerContext } from './chat.reducer';
import type { PreviewItem, MessageItem } from './channel.types';
import type { OptimisticItem, OptimisticMessage } from './channel.reducer';
import { channelReducer, makeInitialChannelState } from './channel.reducer';

const context: ChatReducerContext = { initialized: true, spaceId: 'space-1' };
const baseTime = '2024-01-01T00:00:00.000Z';
const userId = '9f8a416a-39ce-4ec9-8f6a-0d5a7b03b8b9';
const channelId = '0108d348-10f3-4dd9-9108-3ab969629f41';
const characterName = '橘アリス・マーガトロイド';
const draftSource = 'Po Pa Po Pa Po Pa Pan';

const messageId1 = '4bacc4aa-bd70-4b4d-b878-88fb8e163195';
const messageId2 = '8c4ad25f-27b0-45ab-8975-c32d38772211';
const messageId3 = '003572a3-26be-4424-8e2b-b467a9255a2e';
const previewId1 = '7df1fba8-91a4-4800-b4e0-c9c99a8222f8';

const makeMessage = (id: string, pos: number, overrides: Partial<Message> = {}): Message => ({
  id,
  senderId: userId,
  channelId,
  parentMessageId: null,
  name: characterName,
  mediaId: null,
  seed: [],
  inGame: true,
  isAction: false,
  isMaster: false,
  pinned: false,
  tags: [],
  folded: false,
  text: `text-${id}`,
  whisperToUsers: null,
  entities: [],
  created: baseTime,
  modified: baseTime,
  posP: pos,
  posQ: 1,
  pos,
  color: '#000000',
  ...overrides,
});

const makePreview = (id: string, pos: number, overrides: Partial<Preview> = {}): Preview => ({
  id,
  senderId: userId,
  channelId,
  name: characterName,
  entities: [],
  text: `preview-${id}`,
  pos,
  inGame: true,
  ...overrides,
});

const toPreviewItem = (preview: Preview, timestamp = 1): PreviewItem => {
  const pos = Math.ceil(preview.pos);
  return {
    ...preview,
    pos,
    posP: pos,
    posQ: 1,
    type: 'PREVIEW',
    key: preview.senderId,
    timestamp,
  };
};

const makeMessageItem = (message: Message): MessageItem => ({
  ...message,
  type: 'MESSAGE',
  key: message.id,
});

const positions = (list: L.List<MessageItem>): number[] =>
  Array.from(list, (message) => message.pos);

describe('channelReducer', () => {
  test('receiveMessage inserts in order and clears preview/optimistic entry', () => {
    const preview = toPreviewItem(makePreview(previewId1, 3));
    const optimisticMessage: OptimisticMessage = {
      ref: preview,
      item: {
        optimisticPos: preview.pos,
        timestamp: 1,
        item: { ...makeMessageItem(makeMessage('optimistic', preview.pos)), optimistic: true },
      } satisfies OptimisticItem,
    };
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([
        makeMessageItem(makeMessage(messageId1, 1)),
        makeMessageItem(makeMessage(messageId2, 5)),
      ]),
      previewMap: { [preview.senderId]: preview },
      optimisticMessageMap: { [preview.id]: optimisticMessage },
    };

    const next = channelReducer(
      state,
      {
        type: 'receiveMessage',
        payload: {
          type: 'NEW_MESSAGE',
          channelId,
          previewId: preview.id,
          message: makeMessage(messageId3, 3),
        },
      },
      context,
    );

    assert.deepStrictEqual(positions(next.messages), [1, 3, 5]);
    assert.deepStrictEqual(next.previewMap, {});
    assert.deepStrictEqual(next.optimisticMessageMap, {});
  });

  test('receiveMessage with duplicated pos resets messages and loading state', () => {
    const preview = toPreviewItem(makePreview('preview-dup', 1));
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([
        makeMessageItem(makeMessage(messageId1, 1)),
        makeMessageItem(makeMessage(messageId2, 3)),
      ]),
      previewMap: { [preview.senderId]: preview },
      optimisticMessageMap: {
        [preview.id]: {
          ref: preview,
          item: {
            optimisticPos: 1,
            timestamp: 1,
            item: makeMessageItem(makeMessage('optimistic', 1)),
          },
        },
      },
    };

    const next = channelReducer(
      state,
      {
        type: 'receiveMessage',
        payload: {
          type: 'NEW_MESSAGE',
          channelId,
          previewId: preview.id,
          message: makeMessage(messageId3, 1),
        },
      },
      context,
    );

    assert.strictEqual(next.messages.length, 0);
    assert.strictEqual(next.fullLoaded, false);
    assert.deepStrictEqual(next.previewMap, {});
    assert.deepStrictEqual(next.optimisticMessageMap, {});
  });

  test('receiveMessage prepends when pos is above current top and fully loaded', () => {
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([
        makeMessageItem(makeMessage(messageId1, 10)),
        makeMessageItem(makeMessage(messageId2, 20)),
      ]),
    };

    const next = channelReducer(
      state,
      {
        type: 'receiveMessage',
        payload: {
          type: 'NEW_MESSAGE',
          channelId,
          previewId: null,
          message: makeMessage('incoming', 5),
        },
      },
      context,
    );

    assert.deepStrictEqual(positions(next.messages), [5, 10, 20]);
  });

  test('receiveMessage resets when pos equals bottom', () => {
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([
        makeMessageItem(makeMessage(messageId1, 10)),
        makeMessageItem(makeMessage(messageId2, 20)),
      ]),
    };

    const next = channelReducer(
      state,
      {
        type: 'receiveMessage',
        payload: {
          type: 'NEW_MESSAGE',
          channelId,
          previewId: null,
          message: makeMessage('incoming', 20),
        },
      },
      context,
    );

    assert.strictEqual(next.messages.length, 0);
    assert.strictEqual(next.fullLoaded, false);
  });

  test('messageEdited moves message to new position and removes optimistic placeholder', () => {
    const message1 = makeMessageItem(makeMessage(messageId1, 1));
    const message2 = makeMessageItem(makeMessage(messageId2, 3));
    const message3 = makeMessageItem(makeMessage(messageId3, 7));
    const optimisticMessage: OptimisticMessage = {
      ref: message2,
      item: {
        optimisticPos: message2.pos,
        timestamp: 1,
        item: { ...message2, optimistic: true },
      } satisfies OptimisticItem,
    };
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([message1, message2, message3]),
      optimisticMessageMap: { [message2.id]: optimisticMessage },
    };

    const editedMessage = makeMessage(messageId2, 6, { modified: '2024-01-01T00:01:00.000Z' });
    const next = channelReducer(
      state,
      {
        type: 'messageEdited',
        payload: {
          channelId,
          message: editedMessage,
          oldPos: message2.pos,
        },
      },
      context,
    );

    assert.deepStrictEqual(positions(next.messages), [1, 6, 7]);
    const moved = L.nth(1, next.messages);
    assert.strictEqual(moved?.id, messageId2);
    assert.deepStrictEqual(next.optimisticMessageMap, {});
  });

  test('messageEdited updates in place when position unchanged', () => {
    const message = makeMessageItem(makeMessage(messageId1, 2));
    const optimisticMessage: OptimisticMessage = {
      ref: message,
      item: {
        optimisticPos: 2,
        timestamp: 1,
        item: { ...message, optimistic: true },
      },
    };
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([message]),
      optimisticMessageMap: { [message.id]: optimisticMessage },
    };

    const edited = makeMessage(messageId1, 2, {
      text: 'edited',
      modified: '2024-01-01T00:02:00.000Z',
    });
    const next = channelReducer(
      state,
      { type: 'messageEdited', payload: { channelId, message: edited, oldPos: 2 } },
      context,
    );

    assert.strictEqual(next.messages.length, 1);
    const only = L.first(next.messages);
    assert.strictEqual(only?.text, 'edited');
    assert.deepStrictEqual(next.optimisticMessageMap, {});
  });

  test('messageEdited ignores older updates', () => {
    const message = makeMessageItem(
      makeMessage(messageId1, 2, { modified: '2024-01-01T00:02:00.000Z' }),
    );
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([message]),
    };

    const older = makeMessage(messageId1, 2, { modified: '2024-01-01T00:01:00.000Z' });
    const next = channelReducer(
      state,
      { type: 'messageEdited', payload: { channelId, message: older, oldPos: 2 } },
      context,
    );

    assert.strictEqual(next, state);
  });

  test('messageEdited collision resets messages', () => {
    const message1 = makeMessageItem(makeMessage(messageId1, 1));
    const message2 = makeMessageItem(makeMessage(messageId2, 3));
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([message1, message2]),
    };

    const moved = makeMessage(messageId1, 3, { modified: '2024-01-01T00:03:00.000Z' });
    const next = channelReducer(
      state,
      { type: 'messageEdited', payload: { channelId, message: moved, oldPos: 1 } },
      context,
    );

    assert.strictEqual(next.messages.length, 0);
    assert.strictEqual(next.fullLoaded, false);
  });

  test('schedules and performs GC when message count exceeds threshold', () => {
    const longMessages = L.from(
      Array.from({ length: 130 }, (_, index) =>
        makeMessageItem(makeMessage(`m-${index + 1}`, index + 1)),
      ),
    );
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: longMessages,
    };

    const scheduled = channelReducer(
      state,
      {
        type: 'messageDeleted',
        payload: { channelId, messageId: 'missing', pos: 0 },
      },
      context,
    );

    assert.strictEqual(scheduled.scheduledGc?.countdown, 8);
    assert.strictEqual(scheduled.scheduledGc?.lowerPos, 65);
    assert.strictEqual(scheduled.messages.length, 130);

    const readyForGc = channelReducer(
      { ...scheduled, scheduledGc: { countdown: 0, lowerPos: 50 } },
      {
        type: 'messageDeleted',
        payload: { channelId, messageId: 'missing', pos: 0 },
      },
      context,
    );

    assert.strictEqual(readyForGc.scheduledGc, null);
    assert.strictEqual(readyForGc.fullLoaded, false);
    assert.strictEqual(readyForGc.messages.length, 82);
    assert.strictEqual(L.first(readyForGc.messages)?.pos, 49);
  });

  test('messagePreview marks collision when position overlaps existing message', () => {
    const preview = makePreview('preview-collision', 2);
    const state = {
      ...makeInitialChannelState(channelId),
      messages: L.from([makeMessageItem(makeMessage(messageId1, 2))]),
      collidedPreviewIdSet: new Set<string>(),
    };

    const next = channelReducer(
      state,
      { type: 'messagePreview', payload: { channelId, preview, timestamp: 1 } },
      context,
    );

    assert.ok(next.collidedPreviewIdSet.has(preview.id));
    const previewItem = next.previewMap[preview.senderId];
    assert.ok(previewItem);
    assert.strictEqual(previewItem.pos, 2);
  });

  test('messagePreview edit with mismatched metadata is ignored', () => {
    const message = makeMessageItem(
      makeMessage(messageId1, 2, { modified: '2024-01-01T00:01:00.000Z' }),
    );
    const preview = makePreview(messageId1, 2, {
      edit: { time: '2024-01-01T00:02:00.000Z', p: 1, q: 1 },
      senderId: 'other-user',
    });
    const state = {
      ...makeInitialChannelState(channelId),
      messages: L.from([message]),
      previewMap: {},
      collidedPreviewIdSet: new Set<string>(),
    };

    const next = channelReducer(
      state,
      { type: 'messagePreview', payload: { channelId, preview, timestamp: 1 } },
      context,
    );

    assert.strictEqual(Object.keys(next.previewMap).length, 0);
    assert.strictEqual(next.collidedPreviewIdSet.size, 0);
  });

  test('messagePreview edit attaches preview when metadata matches message', () => {
    const message = makeMessageItem(
      makeMessage(messageId1, 4, { modified: '2024-01-01T00:01:00.000Z' }),
    );
    const preview = makePreview(messageId1, 4, {
      edit: { time: message.modified, p: 1, q: 1 },
      senderId: message.senderId,
    });
    const state = {
      ...makeInitialChannelState(channelId),
      messages: L.from([message]),
      previewMap: {},
      collidedPreviewIdSet: new Set<string>(),
    };

    const next = channelReducer(
      state,
      { type: 'messagePreview', payload: { channelId, preview, timestamp: 5 } },
      context,
    );

    const previewItem = next.previewMap[preview.senderId];
    assert.ok(previewItem);
    assert.strictEqual(previewItem.pos, message.pos);
    assert.strictEqual(previewItem.timestamp, 5);
  });

  test('messagePreview rounds fractional pos', () => {
    const preview = makePreview('preview-fraction', 2.4);
    const next = channelReducer(
      makeInitialChannelState(channelId),
      { type: 'messagePreview', payload: { channelId, preview, timestamp: 10 } },
      context,
    );

    const entry = next.previewMap[preview.senderId];
    assert.ok(entry);
    assert.strictEqual(entry.pos, 3);
    assert.strictEqual(entry.posP, 3);
    assert.strictEqual(entry.posQ, 1);
    assert.strictEqual(entry.timestamp, 10);
  });

  test('fail on SEND attaches failTo to optimistic message', () => {
    const optimisticMessage: OptimisticMessage = {
      ref: makeMessageItem(makeMessage('ref', 1)),
      item: {
        optimisticPos: 1,
        timestamp: 1,
        item: { ...makeMessageItem(makeMessage('optimistic', 1)), optimistic: true },
      },
    };
    const state = {
      ...makeInitialChannelState(channelId),
      optimisticMessageMap: { ref: optimisticMessage },
    };

    const next = channelReducer(
      state,
      { type: 'fail', payload: { failTo: { type: 'SEND' }, key: 'ref' } },
      context,
    );

    const updated = next.optimisticMessageMap['ref']?.item.item;
    assert.ok(updated);
    assert.strictEqual(updated.failTo?.type, 'SEND');
  });

  test('fail attaches failTo to stored message and clears optimistic map', () => {
    const message = makeMessageItem(makeMessage(messageId1, 1));
    const optimistic: OptimisticMessage = {
      ref: message,
      item: { optimisticPos: 1, timestamp: 1, item: message },
    };
    const state = {
      ...makeInitialChannelState(channelId),
      messages: L.from([message]),
      optimisticMessageMap: { [message.id]: optimistic },
    };

    const next = channelReducer(
      state,
      { type: 'fail', payload: { failTo: { type: 'EDIT' }, key: message.id } },
      context,
    );

    const stored = L.first(next.messages);
    assert.strictEqual(stored?.failTo?.type, 'EDIT');
    assert.deepStrictEqual(next.optimisticMessageMap, {});
  });

  test('unsorted messages trigger order check reset', () => {
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([
        makeMessageItem(makeMessage(messageId1, 3)),
        makeMessageItem(makeMessage(messageId2, 1)),
        makeMessageItem(makeMessage(messageId3, 4)),
      ]),
    };

    const next = channelReducer(
      state,
      { type: 'messageDeleted', payload: { channelId, messageId: 'x', pos: 0 } },
      context,
    );

    assert.strictEqual(next.messages.length, 0);
    assert.strictEqual(next.fullLoaded, false);
  });

  test('resetGc lowers threshold when new lower pos provided', () => {
    const state = {
      ...makeInitialChannelState(channelId),
      scheduledGc: { countdown: 3, lowerPos: 100 },
    };

    const next = channelReducer(state, { type: 'resetGc', payload: { pos: 80 } }, context);

    assert.strictEqual(next.scheduledGc?.lowerPos, 80);
    assert.strictEqual(next.scheduledGc?.countdown, 7);
  });

  test('resetGc no-op when higher pos provided or no scheduledGc', () => {
    const withGc = channelReducer(
      {
        ...makeInitialChannelState(channelId),
        scheduledGc: { countdown: 5, lowerPos: 50 },
      },
      { type: 'resetGc', payload: { pos: 70 } },
      context,
    );
    assert.strictEqual(withGc.scheduledGc?.lowerPos, 50);
    assert.strictEqual(withGc.scheduledGc?.countdown, 4);

    const withoutGc = channelReducer(
      makeInitialChannelState(channelId),
      { type: 'resetGc', payload: { pos: 10 } },
      context,
    );
    assert.strictEqual(withoutGc.scheduledGc, null);
  });

  test('setOptimisticMessage and removeOptimisticMessage manage map entries', () => {
    const optimistic: OptimisticMessage = {
      ref: makeMessageItem(makeMessage('ref', 1)),
      item: { optimisticPos: 1, timestamp: 1, item: makeMessageItem(makeMessage('ref', 1)) },
    };
    const withEntry = channelReducer(
      makeInitialChannelState(channelId),
      { type: 'setOptimisticMessage', payload: optimistic },
      context,
    );
    assert.ok(withEntry.optimisticMessageMap[optimistic.ref.id]);

    const cleared = channelReducer(
      withEntry,
      { type: 'removeOptimisticMessage', payload: { id: optimistic.ref.id } },
      context,
    );
    assert.deepStrictEqual(cleared.optimisticMessageMap, {});
  });

  test('messageSending without preview does not set optimistic message', () => {
    const next = channelReducer(
      makeInitialChannelState(channelId),
      {
        type: 'messageSending',
        payload: {
          newMessage: {
            previewId: null,
            channelId,
            name: characterName,
            text: draftSource,
            inGame: true,
          },
          sendTime: Date.parse(baseTime),
          media: null,
          composeState: {
            previewId: 'preview',
            source: draftSource,
            media: null,
            whisperTo: undefined,
            focused: false,
            range: [0, 0],
            composingAt: null,
            edit: null,
          },
        },
      },
      context,
    );

    assert.deepStrictEqual(next.optimisticMessageMap, {});
  });

  test('messageSending attaches optimistic entry when preview exists', () => {
    const preview = toPreviewItem(makePreview('prev-1', 10));
    const state = {
      ...makeInitialChannelState(channelId),
      previewMap: { [preview.senderId]: preview },
    };

    const next = channelReducer(
      state,
      {
        type: 'messageSending',
        payload: {
          newMessage: {
            previewId: preview.id,
            channelId,
            name: 'Alice',
            text: draftSource,
            inGame: true,
          },
          sendTime: Date.parse(baseTime),
          media: null,
          composeState: {
            previewId: preview.id,
            source: draftSource,
            media: null,
            whisperTo: undefined,
            focused: false,
            range: [0, 0],
            composingAt: null,
            edit: null,
          },
        },
      },
      context,
    );

    assert.ok(next.optimisticMessageMap[preview.id]);
    assert.strictEqual(Object.keys(next.optimisticMessageMap).length, 1);
  });

  test('messageDeleted removes optimistic entry when message exists', () => {
    const message = makeMessageItem(makeMessage(messageId1, 1));
    const optimistic: OptimisticMessage = {
      ref: message,
      item: { optimisticPos: 1, timestamp: 1, item: message },
    };
    const state = {
      ...makeInitialChannelState(channelId),
      messages: L.from([message]),
      optimisticMessageMap: { [message.id]: optimistic },
    };

    const next = channelReducer(
      state,
      {
        type: 'messageDeleted',
        payload: { channelId, messageId: message.id, pos: 1 },
      },
      context,
    );

    assert.strictEqual(next.messages.length, 0);
    assert.deepStrictEqual(next.optimisticMessageMap, {});
  });

  test('messageDeleted miss keeps state unchanged', () => {
    const message = makeMessageItem(makeMessage(messageId1, 1));
    const optimistic: OptimisticMessage = {
      ref: message,
      item: { optimisticPos: 1, timestamp: 1, item: message },
    };
    const state = {
      ...makeInitialChannelState(channelId),
      messages: L.from([message]),
      optimisticMessageMap: { [message.id]: optimistic },
    };

    const next = channelReducer(
      state,
      {
        type: 'messageDeleted',
        payload: { channelId, messageId: 'missing', pos: 99 },
      },
      context,
    );

    assert.strictEqual(next.messages.length, 1);
    assert.ok(next.optimisticMessageMap[message.id]);
  });

  test('messagesLoaded prepends older messages only', () => {
    const existing = makeMessageItem(makeMessage('m-existing', 10));
    const payloadMessages = [makeMessage('m-newer', 12), makeMessage('m-older', 9)];
    const state = {
      ...makeInitialChannelState(channelId),
      messages: L.from([existing]),
      fullLoaded: false,
    };

    const next = channelReducer(
      state,
      {
        type: 'messagesLoaded',
        payload: {
          messages: payloadMessages,
          before: null,
          channelId,
          fullLoaded: true,
        },
      },
      context,
    );

    assert.strictEqual(L.first(next.messages)?.pos, 9);
    assert.strictEqual(L.last(next.messages)?.pos, 10);
    assert.strictEqual(next.fullLoaded, true);
  });

  test('messagesLoaded is no-op when already fullLoaded', () => {
    const state = {
      ...makeInitialChannelState(channelId),
      fullLoaded: true,
      messages: L.from([makeMessageItem(makeMessage('m-existing', 10))]),
    };

    const next = channelReducer(
      state,
      {
        type: 'messagesLoaded',
        payload: {
          messages: [makeMessage('ignored', 5)],
          before: null,
          channelId,
          fullLoaded: true,
        },
      },
      context,
    );

    assert.strictEqual(next, state);
  });

  test('messagesLoaded with empty payload keeps state unchanged', () => {
    const state = {
      ...makeInitialChannelState(channelId),
      messages: L.from([makeMessageItem(makeMessage('m-existing', 10))]),
      fullLoaded: false,
    };

    const next = channelReducer(
      state,
      {
        type: 'messagesLoaded',
        payload: { messages: [], before: null, channelId, fullLoaded: false },
      },
      context,
    );

    assert.strictEqual(next, state);
  });
});
