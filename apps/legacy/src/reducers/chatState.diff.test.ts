import assert from 'node:assert/strict';
import test from 'node:test';
import { List, Map as ImmutableMap } from 'immutable';
import type { Action } from '../actions';
import type { Channel, MemberWithUser } from '../api/channels';
import type { Events, Preview, PreviewDiff } from '../api/events';
import type { ChatState } from './chatState';
import { initialChatItemSet } from '../states/chat-item-set';

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

const channel = { id: channelId, spaceId } as Channel;

const makeState = (): ChatState => ({
  channel,
  members: [] as MemberWithUser[],
  colorMap: ImmutableMap(),
  initialized: true,
  itemSet: initialChatItemSet,
  finished: false,
  eventAfter: { timestamp: 0, seq: 0, node: 0 },
  lastLoadBefore: Number.MAX_SAFE_INTEGER,
  filter: 'NONE',
  showFolded: false,
  moving: false,
  postponed: List<Action>(),
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
