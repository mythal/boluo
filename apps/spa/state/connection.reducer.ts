import { type ClientConnectionError, type ChatAction, type ChatActionUnion } from './chat.actions';
import { type ChatReducerContext } from './chat.reducer';
import type { ChatEffect } from './chat.types';
import { createEffectId } from './chat.effects';

export interface Connected {
  type: 'CONNECTED';
  connection: WebSocket;
}

export interface Connecting {
  type: 'CONNECTING';
  retry: number;
  recoveringFromError: ClientConnectionError | null;
}

export interface Closed {
  type: 'CLOSED';
  retry: number;
  countdown: number;
  recoveringFromError: ClientConnectionError | null;
}

export interface Error {
  type: 'ERROR';
  code: ClientConnectionError;
  retry: number;
  timestamp: number;
  reason?: string;
  span?: string;
  recoveringFromError: ClientConnectionError | null;
}

export type ConnectionState = Connected | Connecting | Closed | Error;

export const initialConnectionState: ConnectionState = {
  type: 'CLOSED',
  retry: 0,
  countdown: 0,
  recoveringFromError: null,
};

const makeCloseEffect = (connection: WebSocket): ChatEffect => ({
  type: 'CLOSE_CONNECTION',
  id: createEffectId(),
  connection,
});

const handleConnected = (
  state: ConnectionState,
  action: ChatAction<'connected'>,
  mailboxId: string,
): [ConnectionState, ChatEffect[]] => {
  const effects: ChatEffect[] = [];
  if (mailboxId && action.payload.mailboxId !== mailboxId) {
    effects.push(makeCloseEffect(action.payload.connection));
    return [state, effects];
  }
  if (state.type === 'CONNECTED' && state.connection !== action.payload.connection) {
    effects.push(makeCloseEffect(state.connection));
  }
  return [{ type: 'CONNECTED', connection: action.payload.connection }, effects];
};

const handleConnecting = (
  state: ConnectionState,
  action: ChatAction<'connecting'>,
  mailboxId: string,
): [ConnectionState, ChatEffect[]] => {
  const effects: ChatEffect[] = [];
  if (mailboxId && action.payload.mailboxId !== mailboxId) {
    return [state, effects];
  }
  if (state.type === 'CONNECTED') {
    effects.push(makeCloseEffect(state.connection));
  }
  let retry = 0;
  if (state.type === 'CLOSED') {
    retry = state.retry + 1;
  }
  return [
    { type: 'CONNECTING', retry, recoveringFromError: getRecoveringFromError(state) },
    effects,
  ];
};

const RETRY_COUNTDOWN = [0, 0, 2, 3, 3, 5, 3, 5, 7];
const AUTO_RETRY_ERRORS: ClientConnectionError[] = ['NETWORK_ERROR', 'INVALID_TOKEN', 'UNEXPECTED'];

const shouldAutoRetry = (code: ClientConnectionError): boolean => AUTO_RETRY_ERRORS.includes(code);
const getRecoveringFromError = (state: ConnectionState): ClientConnectionError | null =>
  state.type === 'CONNECTED' ? null : state.recoveringFromError;

const handleConnectionClosed = (
  state: ConnectionState,
  { payload }: ChatAction<'connectionClosed'>,
  mailboxId: string,
): [ConnectionState, ChatEffect[]] => {
  if (mailboxId && payload.mailboxId !== mailboxId) {
    return [state, []];
  } else if (state.type === 'ERROR') {
    return [state, []];
  }
  let retry = 0;
  if (state.type === 'CONNECTING') {
    retry = state.retry;
  }
  let countdown = 1;
  if (retry > 2) {
    const { random } = payload;
    let offset = 0;
    if (random < 0.333) {
      offset = -1;
    }
    if (random > 0.333) {
      offset = 1;
    }
    countdown = RETRY_COUNTDOWN[retry] ?? 8 + offset;
  }
  return [
    { type: 'CLOSED', retry, countdown, recoveringFromError: getRecoveringFromError(state) },
    [],
  ];
};

const handleConnectionError = (
  state: ConnectionState,
  { payload }: ChatAction<'connectionError'>,
  mailboxId: string,
): [ConnectionState, ChatEffect[]] => {
  const effects: ChatEffect[] = [];
  if (mailboxId && payload.mailboxId !== mailboxId) {
    return [state, effects];
  }
  const retry =
    state.type === 'CONNECTING' || state.type === 'CLOSED' || state.type === 'ERROR'
      ? state.retry
      : 0;
  if (state.type === 'CONNECTED') {
    effects.push(makeCloseEffect(state.connection));
  }
  const recoveringFromError = getRecoveringFromError(state);
  if (shouldAutoRetry(payload.code) && recoveringFromError == null) {
    return [{ type: 'CLOSED', retry, countdown: 0, recoveringFromError: payload.code }, effects];
  }
  return [
    {
      type: 'ERROR',
      code: payload.code,
      retry,
      timestamp: payload.timestamp,
      reason: payload.reason,
      span: payload.span,
      recoveringFromError,
    },
    effects,
  ];
};

const handleReconnectCountdownTick = (
  connection: ConnectionState,
  { payload: { immediately = false } }: ChatAction<'reconnectCountdownTick'>,
): [ConnectionState, ChatEffect[]] => {
  if (connection.type !== 'CLOSED') {
    return [connection, []];
  }
  const countdown = immediately ? 0 : connection.countdown - 1;
  return [{ ...connection, countdown }, []];
};

const handleDebugCloseConnection = (
  state: ConnectionState,
  { payload: { countdown } }: ChatAction<'debugCloseConnection'>,
): [ConnectionState, ChatEffect[]] => {
  const effects: ChatEffect[] = [];
  if (state.type === 'CONNECTED') {
    effects.push(makeCloseEffect(state.connection));
  }
  return [{ type: 'CLOSED', retry: 4, countdown, recoveringFromError: null }, effects];
};

const handleRetryConnection = (
  state: ConnectionState,
  { payload }: ChatAction<'retryConnection'>,
  mailboxId: string,
): [ConnectionState, ChatEffect[]] => {
  const effects: ChatEffect[] = [];
  if (mailboxId && payload.mailboxId !== mailboxId) {
    return [state, effects];
  }
  if (state.type === 'CONNECTED') {
    effects.push(makeCloseEffect(state.connection));
  }
  const retry =
    state.type === 'CONNECTING' || state.type === 'CLOSED' || state.type === 'ERROR'
      ? state.retry
      : 0;
  return [{ type: 'CLOSED', retry, countdown: 0, recoveringFromError: null }, effects];
};

export const connectionReducer = (
  state: ConnectionState,
  action: ChatActionUnion,
  { spaceId: mailboxId }: ChatReducerContext,
): [ConnectionState, ChatEffect[]] => {
  switch (action.type) {
    case 'connected':
      return handleConnected(state, action, mailboxId);
    case 'connecting':
      return handleConnecting(state, action, mailboxId);
    case 'connectionClosed':
      return handleConnectionClosed(state, action, mailboxId);
    case 'connectionError':
      return handleConnectionError(state, action, mailboxId);
    case 'retryConnection':
      return handleRetryConnection(state, action, mailboxId);
    case 'reconnectCountdownTick':
      return handleReconnectCountdownTick(state, action);
    case 'debugCloseConnection':
      return handleDebugCloseConnection(state, action);
  }
  return [state, []];
};
