import assert from 'node:assert/strict';
import test from 'node:test';
import { List, Map as ImmutableMap } from 'immutable';
import type { Action } from '../actions';
import type { Channel, MemberWithUser } from '../api/channels';
import type { Events, Preview, PreviewDiff } from '../api/events';
import type { Message } from '../api/messages';
import type { ChatState } from './chatState';
import { getOldestMessage, initialChatItemSet } from '../states/chat-item-set';

const storage = (() => {
  const values = new globalThis.Map<string, string>();
  const localStorageLike: Storage = {
    length: 0,
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  return localStorageLike;
})();

const globalLike = globalThis as typeof globalThis & {
  localStorage?: Storage;
  window?: Window & typeof globalThis;
};
globalLike.localStorage = storage;
globalLike.window = { crypto: globalThis.crypto } as Window & typeof globalThis;

const { chatReducer } = await import('./chatState');

const spaceId = 'space-1';
const channelId = 'channel-1';
const senderId = 'user-1';
const previewId = 'preview-1';
const initialRequestId = 'request-1';
const baseTime = '2024-01-01T00:00:00.000Z';

const channel = { id: channelId, spaceId } as Channel;

const makeState = (): ChatState => ({
  channel,
  members: [] as MemberWithUser[],
  colorMap: ImmutableMap(),
  initialized: true,
  itemSet: initialChatItemSet,
  finished: false,
  eventAfter: { timestamp: 0, seq: 0, node: 0 },
  historyMutationGeneration: 0,
  lastLoadBefore: Number.MAX_SAFE_INTEGER,
  filter: 'NONE',
  showFolded: false,
  moving: false,
  postponed: List<Action>(),
  initialHistoryLoad: null,
  compose: {
    initialized: true,
    inputName: '',
    isAction: false,
    entities: [],
    sending: false,
    edit: null,
    messageId: 'compose-1',
    media: undefined,
    source: '',
    whisperTo: null,
    inGame: true,
    broadcast: true,
  },
});

const makeEvent = (body: Events['body'], timestamp: number): Events => ({
  mailbox: spaceId,
  id: { timestamp, seq: 1, node: 1 },
  body,
  live: 'V',
});

const makePreview = (overrides: Partial<Preview> = {}): Preview => ({
  id: previewId,
  senderId,
  channelId,
  name: 'Alice',
  entities: [{ type: 'Text', start: 0, len: 5 }],
  text: 'hello',
  pos: 1,
  v: 1,
  ...overrides,
});

const makeMessage = (id: string, pos: number, overrides: Partial<Message> = {}): Message => ({
  id,
  senderId,
  channelId,
  parentMessageId: null,
  name: 'Alice',
  characterId: null,
  portraitId: null,
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
  rev: 0,
  posP: pos,
  posQ: 1,
  pos,
  color: '#000000',
  ...overrides,
});

const makeDiff = (overrides: Partial<PreviewDiff['_']> = {}): PreviewDiff => ({
  sender: senderId,
  _: {
    ch: channelId,
    id: previewId,
    ref: 1,
    v: 2,
    op: [{ type: 'A', _: ' world' }],
    ...overrides,
  },
});

const applyEvent = (state: ChatState, event: Events): ChatState => {
  const action: Action = { type: 'EVENT_RECEIVED', event };
  const next = chatReducer(state, action, undefined);
  assert.ok(next);
  return next;
};

const applyAction = (state: ChatState, action: Action): ChatState => {
  const next = chatReducer(state, action, undefined);
  assert.ok(next);
  return next;
};

const startInitialHistoryLoad = (state: ChatState, requestId = initialRequestId): ChatState =>
  applyAction(state, { type: 'INITIAL_HISTORY_LOAD_STARTED', requestId, pane: channelId });

const finishInitialHistoryLoad = (
  state: ChatState,
  messages: Message[],
  finished = false,
  requestId = initialRequestId,
): ChatState =>
  applyAction(state, {
    type: 'LOAD_MESSAGES',
    mode: 'INITIAL',
    requestId,
    messages,
    finished,
    pane: channelId,
  });

test('legacy chatReducer applies preview diff update', () => {
  let state = makeState();
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_PREVIEW', channelId, preview: makePreview() }, 1),
  );
  state = applyEvent(state, makeEvent({ type: 'DIFF', channelId, diff: makeDiff() }, 2));

  const previewItem = state.itemSet.previews.get(senderId);
  assert.ok(previewItem);
  assert.strictEqual(previewItem.preview.text, 'hello world');
  assert.strictEqual(previewItem.preview.v, 2);
});

test('legacy chatReducer removes a whitespace-only preview', () => {
  let state = makeState();
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_PREVIEW', channelId, preview: makePreview() }, 1),
  );
  state = applyEvent(
    state,
    makeEvent(
      {
        type: 'MESSAGE_PREVIEW',
        channelId,
        preview: makePreview({
          text: '   ',
          entities: [{ type: 'Text', start: 0, len: 3 }],
        }),
      },
      2,
    ),
  );

  assert.strictEqual(state.itemSet.previews.get(senderId), undefined);
});

test('legacy chatReducer ignores preview diff with mismatched keyframe ref', () => {
  let state = makeState();
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_PREVIEW', channelId, preview: makePreview() }, 1),
  );
  state = applyEvent(
    state,
    makeEvent({ type: 'DIFF', channelId, diff: makeDiff({ ref: 999, v: 2 }) }, 2),
  );

  const previewItem = state.itemSet.previews.get(senderId);
  assert.ok(previewItem);
  assert.strictEqual(previewItem.preview.text, 'hello');
  assert.strictEqual(previewItem.preview.v, 1);
});

test('legacy chatReducer ignores stale preview diff version', () => {
  let state = makeState();
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_PREVIEW', channelId, preview: makePreview({ v: 2 }) }, 1),
  );
  state = applyEvent(
    state,
    makeEvent({ type: 'DIFF', channelId, diff: makeDiff({ ref: 2, v: 2 }) }, 2),
  );

  const previewItem = state.itemSet.previews.get(senderId);
  assert.ok(previewItem);
  assert.strictEqual(previewItem.preview.text, 'hello');
  assert.strictEqual(previewItem.preview.v, 2);
});

test('legacy chatReducer preserves compose content when sending fails', () => {
  const media = new File(['image'], 'image.png', { type: 'image/png' });
  let state = makeState();
  state = {
    ...state,
    compose: { ...state.compose, source: 'hello', media },
  };

  const sending = chatReducer(state, { type: 'COMPOSE_SENDING', pane: channelId }, undefined);
  assert.ok(sending);
  assert.strictEqual(sending.compose.sending, true);
  assert.strictEqual(sending.compose.source, 'hello');
  assert.strictEqual(sending.compose.media, media);

  const changedWhileSending = chatReducer(
    sending,
    { type: 'SET_COMPOSE_SOURCE', pane: channelId, source: 'replacement' },
    undefined,
  );
  assert.strictEqual(changedWhileSending, sending);

  const failed = chatReducer(sending, { type: 'COMPOSE_SEND_FAILED', pane: channelId }, undefined);
  assert.ok(failed);
  assert.strictEqual(failed.compose.sending, false);
  assert.strictEqual(failed.compose.source, 'hello');
  assert.strictEqual(failed.compose.media, media);
});

test('legacy chatReducer clears compose content only after sending succeeds', () => {
  const media = new File(['image'], 'image.png', { type: 'image/png' });
  const state = {
    ...makeState(),
    compose: { ...makeState().compose, sending: true, source: 'hello', media },
  };

  const sent = chatReducer(
    state,
    { type: 'RESET_COMPOSE_AFTER_SENT', pane: channelId, newId: 'compose-2' },
    undefined,
  );
  assert.ok(sent);
  assert.strictEqual(sent.compose.sending, false);
  assert.strictEqual(sent.compose.source, '');
  assert.strictEqual(sent.compose.media, undefined);
});

test('legacy chatReducer keeps an overlapping live message updated during initial loading', () => {
  const message = makeMessage('message-1', 5);
  const edited = { ...message, text: 'edited', rev: 1 };
  const newerSnapshot = { ...message, text: 'newer snapshot', rev: 2 };
  let state = startInitialHistoryLoad(makeState());
  state = applyEvent(
    state,
    makeEvent({ type: 'NEW_MESSAGE', channelId, message, previewId: null }, 1),
  );
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_EDITED', channelId, message: edited, oldPos: message.pos }, 2),
  );
  const liveItem = state.itemSet.messages.first();
  assert.ok(liveItem?.type === 'MESSAGE');
  assert.strictEqual(liveItem.message.text, 'edited');

  state = finishInitialHistoryLoad(state, [newerSnapshot]);

  assert.deepStrictEqual(state.itemSet.messages.map((item) => item.id).toArray(), [message.id]);
  const loadedItem = state.itemSet.messages.first();
  assert.ok(loadedItem?.type === 'MESSAGE');
  assert.strictEqual(loadedItem.message.text, 'newer snapshot');
});

test('legacy chatReducer ignores a stale new-message event after a newer snapshot', () => {
  const messageId = 'message-1';
  const newerSnapshot = makeMessage(messageId, 12, {
    text: 'newer snapshot',
    rev: 2,
  });
  const staleNewMessage = makeMessage(messageId, 5, {
    text: 'stale new message',
  });
  let state = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [newerSnapshot]);

  state = applyEvent(
    state,
    makeEvent({ type: 'NEW_MESSAGE', channelId, message: staleNewMessage, previewId: null }, 1),
  );

  const matchingItems = state.itemSet.messages.filter(
    (item) => item.type === 'MESSAGE' && item.id === messageId,
  );
  assert.strictEqual(matchingItems.size, 1);
  const item = matchingItems.first();
  assert.ok(item?.type === 'MESSAGE');
  assert.strictEqual(item.pos, newerSnapshot.pos);
  assert.strictEqual(item.message.text, newerSnapshot.text);
  assert.strictEqual(item.message.rev, newerSnapshot.rev);
});

test('legacy chatReducer ignores an older revealed message', () => {
  const current = makeMessage('message-1', 5, { rev: 2, text: 'current' });
  const staleReveal = makeMessage(current.id, current.pos, { rev: 1, text: 'stale reveal' });
  const state = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [current]);

  const nextState = applyAction(state, {
    type: 'REVEAL_MESSAGE',
    message: staleReveal,
    pane: channelId,
  });

  assert.strictEqual(nextState, state);
});

test('legacy chatReducer applies an equal-version revealed message', () => {
  const redacted = makeMessage('message-1', 5, {
    rev: 2,
    text: '',
    whisperToUsers: [senderId],
  });
  const revealed = makeMessage(redacted.id, redacted.pos, {
    rev: redacted.rev,
    text: 'revealed',
    entities: [{ type: 'Text', start: 0, len: 8 }],
    whisperToUsers: redacted.whisperToUsers,
  });
  let state = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [redacted]);

  state = applyAction(state, {
    type: 'REVEAL_MESSAGE',
    message: revealed,
    pane: channelId,
  });

  const item = state.itemSet.messages.first();
  assert.ok(item?.type === 'MESSAGE');
  assert.strictEqual(item.message.text, revealed.text);
  assert.strictEqual(item.message.rev, revealed.rev);
});

test('legacy chatReducer replays an edit received during the initial history load', () => {
  const original = makeMessage('message-1', 5);
  const edited = { ...original, text: 'edited', rev: 1 };
  let state = startInitialHistoryLoad(makeState());
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_EDITED', channelId, message: edited, oldPos: original.pos }, 1),
  );
  state = finishInitialHistoryLoad(state, [original]);

  const item = state.itemSet.messages.first();
  assert.ok(item?.type === 'MESSAGE');
  assert.strictEqual(item.message.text, 'edited');
});

test('legacy chatReducer uses the oldest message as the edit replay boundary', () => {
  const original = makeMessage('moved-message', 12);
  const moved = makeMessage(original.id, 5, { rev: 1 });
  const reconcile = (finished: boolean): ChatState => {
    let state = startInitialHistoryLoad(makeState());
    state = applyEvent(
      state,
      makeEvent({ type: 'MESSAGE_PREVIEW', channelId, preview: makePreview({ pos: 1 }) }, 1),
    );
    state = applyEvent(
      state,
      makeEvent({ type: 'MESSAGE_EDITED', channelId, message: moved, oldPos: original.pos }, 2),
    );
    return finishInitialHistoryLoad(
      state,
      [original, makeMessage('history-boundary', 10)],
      finished,
    );
  };

  const partial = reconcile(false);
  assert.deepStrictEqual(partial.itemSet.messages.map((item) => item.pos).toArray(), [1, 10]);
  assert.strictEqual(getOldestMessage(partial.itemSet)?.pos, 10);

  const full = reconcile(true);
  assert.deepStrictEqual(full.itemSet.messages.map((item) => item.pos).toArray(), [1, 5, 10]);
  assert.strictEqual(getOldestMessage(full.itemSet)?.pos, 5);
});

test('legacy chatReducer does not replay an older edit over a newer initial snapshot', () => {
  const original = makeMessage('message-1', 5);
  const edited = { ...original, text: 'edited', rev: 1 };
  const newerSnapshot = { ...original, text: 'newer snapshot', rev: 2 };
  let state = startInitialHistoryLoad(makeState());
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_EDITED', channelId, message: edited, oldPos: original.pos }, 1),
  );
  state = finishInitialHistoryLoad(state, [newerSnapshot]);

  const item = state.itemSet.messages.first();
  assert.ok(item?.type === 'MESSAGE');
  assert.strictEqual(item.message.text, 'newer snapshot');
  assert.strictEqual(item.message.rev, 2);
});

test('legacy chatReducer preserves an edit preview while merging initial history', () => {
  const message = makeMessage('message-1', 5);
  const preview = makePreview({
    id: message.id,
    pos: message.pos,
    edit: { time: message.modified, p: message.posP, q: message.posQ },
  });
  let state = startInitialHistoryLoad(makeState());
  state = applyEvent(state, makeEvent({ type: 'MESSAGE_PREVIEW', channelId, preview }, 1));
  state = finishInitialHistoryLoad(state, [message]);
  state = applyEvent(
    state,
    makeEvent({ type: 'DIFF', channelId, diff: makeDiff({ id: message.id }) }, 2),
  );

  const previewItem = state.itemSet.previews.get(senderId);
  assert.ok(previewItem);
  assert.strictEqual(previewItem.preview.text, 'hello world');
});

test('legacy chatReducer replays a deletion received during the initial history load', () => {
  const message = makeMessage('message-1', 5);
  let state = startInitialHistoryLoad(makeState());
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_DELETED', channelId, messageId: message.id, pos: message.pos }, 1),
  );
  state = finishInitialHistoryLoad(state, [message]);

  assert.strictEqual(state.itemSet.messages.size, 0);
});

test('legacy chatReducer ignores a stale initial history response', () => {
  let state = startInitialHistoryLoad(makeState());
  state = startInitialHistoryLoad(state, 'request-2');
  const nextState = applyAction(state, {
    type: 'LOAD_MESSAGES',
    mode: 'INITIAL',
    requestId: initialRequestId,
    messages: [makeMessage('stale', 1)],
    finished: true,
    pane: channelId,
  });

  assert.strictEqual(nextState, state);
  assert.strictEqual(nextState.initialHistoryLoad?.requestId, 'request-2');
  const afterStaleFailure = applyAction(nextState, {
    type: 'INITIAL_HISTORY_LOAD_FAILED',
    requestId: initialRequestId,
    pane: channelId,
  });
  assert.strictEqual(afterStaleFailure, nextState);
  const afterCurrentFailure = applyAction(afterStaleFailure, {
    type: 'INITIAL_HISTORY_LOAD_FAILED',
    requestId: 'request-2',
    pane: channelId,
  });
  assert.strictEqual(afterCurrentFailure.initialHistoryLoad, null);
});

test('legacy chatReducer ignores a load-more response after its boundary changes', () => {
  const initialState = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [
    makeMessage('message-10', 10),
    makeMessage('message-8', 8),
  ]);
  const action: Action = {
    type: 'LOAD_MESSAGES',
    mode: 'MORE',
    before: 8,
    historyMutationGeneration: initialState.historyMutationGeneration,
    messages: [makeMessage('message-6', 6), makeMessage('message-4', 4)],
    finished: false,
    pane: channelId,
  };

  const once = applyAction(initialState, action);
  const twice = applyAction(once, action);

  assert.deepStrictEqual(once.itemSet.messages.map((item) => item.pos).toArray(), [4, 6, 8, 10]);
  assert.strictEqual(twice, once);
});

test('legacy chatReducer ignores a load-more response after a persistent mutation', () => {
  const deletedMessage = makeMessage('deleted-message', 8);
  let state = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [
    makeMessage('boundary', 10),
  ]);
  const historyMutationGeneration = state.historyMutationGeneration;
  state = applyEvent(state, {
    ...makeEvent(
      {
        type: 'MESSAGE_DELETED',
        channelId,
        messageId: deletedMessage.id,
        pos: deletedMessage.pos,
      },
      1,
    ),
    live: 'P',
  });

  const afterMutation = state;
  assert.strictEqual(state.historyMutationGeneration, historyMutationGeneration + 1);
  state = applyAction(state, {
    type: 'LOAD_MESSAGES',
    mode: 'MORE',
    before: 10,
    historyMutationGeneration,
    messages: [deletedMessage],
    finished: false,
    pane: channelId,
  });

  assert.strictEqual(state, afterMutation);
  assert.strictEqual(
    state.itemSet.messages.some((item) => item.type === 'MESSAGE' && item.id === deletedMessage.id),
    false,
  );
});

test('legacy chatReducer accepts a load-more response after a persistent new message', () => {
  const liveMessage = makeMessage('live-message', 20);
  let state = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [
    makeMessage('boundary', 10),
  ]);
  const historyMutationGeneration = state.historyMutationGeneration;
  state = applyEvent(state, {
    ...makeEvent({ type: 'NEW_MESSAGE', channelId, message: liveMessage, previewId: null }, 1),
    live: 'P',
  });

  assert.strictEqual(state.historyMutationGeneration, historyMutationGeneration);
  state = applyAction(state, {
    type: 'LOAD_MESSAGES',
    mode: 'MORE',
    before: 10,
    historyMutationGeneration,
    messages: [makeMessage('history-message', 8)],
    finished: false,
    pane: channelId,
  });

  assert.deepStrictEqual(state.itemSet.messages.map((item) => item.pos).toArray(), [8, 10, 20]);
});

test('legacy chatReducer preserves preview ordering while loading more history', () => {
  let state = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [
    makeMessage('message-12', 12),
    makeMessage('message-10', 10),
  ]);
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_PREVIEW', channelId, preview: makePreview({ pos: 1 }) }, 1),
  );
  state = applyAction(state, {
    type: 'LOAD_MESSAGES',
    mode: 'MORE',
    before: 10,
    historyMutationGeneration: state.historyMutationGeneration,
    messages: [makeMessage('message-8', 8), makeMessage('message-6', 6)],
    finished: false,
    pane: channelId,
  });

  assert.deepStrictEqual(
    state.itemSet.messages.map((item) => item.pos).toArray(),
    [1, 6, 8, 10, 12],
  );
});

test('legacy chatReducer resolves a new-message preview while loading more history', () => {
  const committedMessage = makeMessage(previewId, 7);
  let state = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [
    makeMessage('message-10', 10),
  ]);
  state = applyEvent(
    state,
    makeEvent({ type: 'MESSAGE_PREVIEW', channelId, preview: makePreview({ pos: 7 }) }, 1),
  );
  state = applyAction(state, {
    type: 'LOAD_MESSAGES',
    mode: 'MORE',
    before: 10,
    historyMutationGeneration: state.historyMutationGeneration,
    messages: [committedMessage],
    finished: false,
    pane: channelId,
  });

  assert.strictEqual(state.itemSet.previews.get(senderId), undefined);
  assert.deepStrictEqual(state.itemSet.messages.map((item) => item.id).toArray(), [
    committedMessage.id,
    'message-10',
  ]);
});

test('legacy chatReducer ignores an older duplicate from a load-more snapshot', () => {
  const current = makeMessage('moved-message', 12, { rev: 2, text: 'current' });
  const stale = makeMessage(current.id, 8, { rev: 1, text: 'stale' });
  let state = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [
    current,
    makeMessage('boundary', 10),
  ]);
  state = applyAction(state, {
    type: 'LOAD_MESSAGES',
    mode: 'MORE',
    before: 10,
    historyMutationGeneration: state.historyMutationGeneration,
    messages: [stale, makeMessage('message-6', 6)],
    finished: false,
    pane: channelId,
  });

  const movedMessages = state.itemSet.messages.filter(
    (item) => item.type === 'MESSAGE' && item.id === current.id,
  );
  assert.strictEqual(movedMessages.size, 1);
  const movedMessage = movedMessages.first();
  assert.ok(movedMessage?.type === 'MESSAGE');
  assert.strictEqual(movedMessage.message.rev, 2);
  assert.deepStrictEqual(state.itemSet.messages.map((item) => item.pos).toArray(), [6, 10, 12]);
});

test('legacy chatReducer keeps the strict before boundary for loading more history', () => {
  const state = finishInitialHistoryLoad(startInitialHistoryLoad(makeState()), [
    makeMessage('boundary', 5),
  ]);
  assert.throws(
    () =>
      chatReducer(
        state,
        {
          type: 'LOAD_MESSAGES',
          mode: 'MORE',
          before: 5,
          historyMutationGeneration: state.historyMutationGeneration,
          messages: [makeMessage('overlapping', 5)],
          finished: false,
          pane: channelId,
        },
        undefined,
      ),
    /Incorrect messages order/,
  );
});
