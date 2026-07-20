import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClientEvent, PreviewPost } from '@boluo/types/bindings';
import {
  createPreviewPublisher,
  type PreviewPublisher,
  type PreviewPublisherRuntimeDeps,
} from './publisher';

type FakeConnection = { id: string };
type TimerTask = { callback: () => void; delay: number };

const makePreview = (overrides: Partial<PreviewPost> = {}): PreviewPost => ({
  id: 'preview-1',
  channelId: 'channel-1',
  name: 'Alice',
  mediaId: null,
  inGame: true,
  isAction: false,
  text: 'hello',
  clear: false,
  entities: [{ type: 'Text', start: 0, len: 5 }],
  editFor: null,
  edit: null,
  ...overrides,
});

const makeHarness = ({
  sendResult = true,
}: {
  sendResult?: boolean;
} = {}): {
  publisher: PreviewPublisher<FakeConnection>;
  sent: Array<{ connection: FakeConnection; event: ClientEvent }>;
  reconnects: FakeConnection[];
  runTimer: (delay: number) => void;
  timerCount: () => number;
} => {
  let nextTimer = 0;
  let now = 1_000;
  const timers = new Map<number, TimerTask>();
  const sent: Array<{ connection: FakeConnection; event: ClientEvent }> = [];
  const reconnects: FakeConnection[] = [];
  const deps: PreviewPublisherRuntimeDeps<FakeConnection, number> = {
    debounceMs: 250,
    now: () => now,
    send: (connection, event) => {
      sent.push({ connection, event });
      return sendResult;
    },
    setTimer: (callback, delay) => {
      const handle = ++nextTimer;
      timers.set(handle, { callback, delay });
      return handle;
    },
    clearTimer: (handle) => {
      timers.delete(handle);
    },
    requestReconnect: (connection) => {
      reconnects.push(connection);
    },
  };
  const publisher = createPreviewPublisher(deps);
  const runTimer = (delay: number): void => {
    const entry = [...timers.entries()].find(([, task]) => task.delay === delay);
    assert.ok(entry, `expected a ${delay}ms timer`);
    const [handle, task] = entry;
    timers.delete(handle);
    now += delay;
    task.callback();
  };
  return {
    publisher,
    sent,
    reconnects,
    runTimer,
    timerCount: () => timers.size,
  };
};

test('publisher retains a draft until initialization and republishes on reconnect', () => {
  const firstConnection = { id: 'first' };
  const secondConnection = { id: 'second' };
  const { publisher, sent, runTimer } = makeHarness();

  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: { preview: makePreview() },
  });
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection: firstConnection,
    initialized: false,
  });
  assert.strictEqual(sent.length, 0);

  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection: firstConnection,
    initialized: true,
  });
  runTimer(250);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0]?.connection, firstConnection);
  assert.strictEqual(sent[0]?.event.type, 'PREVIEW');

  const pendingKeyframe = publisher.getState().pendingAcknowledgement;
  assert.ok(pendingKeyframe);
  publisher.dispatch({
    type: 'ACKNOWLEDGEMENT_RECEIVED',
    source: pendingKeyframe.connection,
    acknowledgement: pendingKeyframe.expected,
  });

  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: {
      preview: makePreview({
        text: 'hello world',
        entities: [{ type: 'Text', start: 0, len: 11 }],
      }),
    },
  });
  runTimer(250);
  assert.strictEqual(sent[1]?.event.type, 'DIFF');

  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection: secondConnection,
    initialized: true,
  });
  runTimer(250);
  assert.strictEqual(sent[2]?.connection, secondConnection);
  assert.strictEqual(sent[2]?.event.type, 'PREVIEW');
});

test('publisher does not advance send state when transport send fails', () => {
  const connection = { id: 'connection' };
  const { publisher, sent, runTimer, timerCount } = makeHarness({
    sendResult: false,
  });

  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection,
    initialized: true,
  });
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: { preview: makePreview() },
  });
  runTimer(250);

  assert.strictEqual(sent.length, 1);
  assert.strictEqual(publisher.getState().sendState, null);
  assert.strictEqual(publisher.getState().pendingSend, null);
  assert.strictEqual(publisher.getState().pendingAcknowledgement, null);
  assert.strictEqual(timerCount(), 0);
});

test('publisher forces a keyframe without resetting versions after being re-enabled', () => {
  const connection = { id: 'connection' };
  const { publisher, sent, runTimer } = makeHarness();
  const acknowledgePending = () => {
    const pending = publisher.getState().pendingAcknowledgement;
    assert.ok(pending);
    publisher.dispatch({
      type: 'ACKNOWLEDGEMENT_RECEIVED',
      source: pending.connection,
      acknowledgement: pending.expected,
    });
  };

  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection,
    initialized: true,
  });
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: { preview: makePreview() },
  });
  runTimer(250);
  assert.strictEqual(sent[0]?.event.type, 'PREVIEW');
  if (sent[0]?.event.type !== 'PREVIEW') return;
  assert.strictEqual(sent[0].event.preview.v, 1);
  acknowledgePending();

  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: {
      preview: makePreview({
        text: 'hello world',
        entities: [{ type: 'Text', start: 0, len: 11 }],
      }),
    },
  });
  runTimer(250);
  assert.strictEqual(sent[1]?.event.type, 'DIFF');
  if (sent[1]?.event.type !== 'DIFF') return;
  assert.strictEqual(sent[1].event.preview.ref, 1);
  assert.strictEqual(sent[1].event.preview.v, 2);
  acknowledgePending();

  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: false });
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  runTimer(250);
  assert.strictEqual(sent[2]?.event.type, 'PREVIEW');
  if (sent[2]?.event.type !== 'PREVIEW') return;
  assert.strictEqual(sent[2].event.preview.v, 3);
  acknowledgePending();

  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: {
      preview: makePreview({
        text: 'hello world!',
        entities: [{ type: 'Text', start: 0, len: 12 }],
      }),
    },
  });
  runTimer(250);
  assert.strictEqual(sent[3]?.event.type, 'DIFF');
  if (sent[3]?.event.type !== 'DIFF') return;
  assert.strictEqual(sent[3].event.preview.ref, 3);
  assert.strictEqual(sent[3].event.preview.v, 4);
});

test('publisher invalidates its keyframe and reconnects once on acknowledgement timeout', () => {
  const connection = { id: 'connection' };
  const { publisher, reconnects, runTimer } = makeHarness();

  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection,
    initialized: true,
  });
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: { preview: makePreview() },
  });
  runTimer(250);
  runTimer(15_000);

  assert.deepStrictEqual(reconnects, [connection]);
  assert.strictEqual(publisher.getState().sendState, null);

  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: {
      preview: makePreview({ text: 'again' }),
    },
  });
  runTimer(250);
  runTimer(15_000);
  assert.deepStrictEqual(reconnects, [connection]);
});

test('a successful acknowledgement re-enables timeout reconnect', () => {
  const connection = { id: 'connection' };
  const { publisher, reconnects, runTimer } = makeHarness();

  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection,
    initialized: true,
  });
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: { preview: makePreview() },
  });
  runTimer(250);
  runTimer(15_000);
  assert.deepStrictEqual(reconnects, [connection]);

  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: {
      preview: makePreview({ text: 'again' }),
    },
  });
  runTimer(250);
  const pending = publisher.getState().pendingAcknowledgement;
  assert.ok(pending);
  publisher.dispatch({
    type: 'ACKNOWLEDGEMENT_RECEIVED',
    source: pending.connection,
    acknowledgement: pending.expected,
  });

  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: {
      preview: makePreview({ text: 'third' }),
    },
  });
  runTimer(250);
  runTimer(15_000);
  assert.deepStrictEqual(reconnects, [connection, connection]);
});

test('publisher disposal clears timers and supports React effect reactivation', () => {
  const { publisher, sent, runTimer, timerCount } = makeHarness();
  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: { preview: makePreview() },
  });
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection: { id: 'connection' },
    initialized: true,
  });
  assert.strictEqual(timerCount(), 1);

  publisher.dispose();
  assert.strictEqual(timerCount(), 0);
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  assert.strictEqual(publisher.getState().disposed, true);

  publisher.activate();
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection: { id: 'reactivated' },
    initialized: true,
  });
  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: { preview: makePreview() },
  });
  runTimer(250);
  assert.strictEqual(sent.length, 1);
});

test('publisher ignores a matching acknowledgement from a stale connection', () => {
  const oldConnection = { id: 'old' };
  const newConnection = { id: 'new' };
  const { publisher, runTimer, timerCount } = makeHarness();

  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection: oldConnection,
    initialized: true,
  });
  publisher.dispatch({ type: 'ENABLED_CHANGED', enabled: true });
  publisher.dispatch({
    type: 'DESIRED_PREVIEW_CHANGED',
    desired: { preview: makePreview() },
  });
  runTimer(250);

  publisher.dispatch({
    type: 'CONNECTION_STATE_CHANGED',
    connection: newConnection,
    initialized: true,
  });
  runTimer(250);
  const pending = publisher.getState().pendingAcknowledgement;
  assert.ok(pending);
  assert.strictEqual(pending.connection, newConnection);

  publisher.dispatch({
    type: 'ACKNOWLEDGEMENT_RECEIVED',
    source: oldConnection,
    acknowledgement: pending.expected,
  });
  assert.strictEqual(publisher.getState().pendingAcknowledgement, pending);
  assert.strictEqual(timerCount(), 1);

  publisher.dispatch({
    type: 'ACKNOWLEDGEMENT_RECEIVED',
    source: newConnection,
    acknowledgement: pending.expected,
  });
  assert.strictEqual(publisher.getState().pendingAcknowledgement, null);
  assert.strictEqual(timerCount(), 0);
});
