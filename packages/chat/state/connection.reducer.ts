import { store } from '@boluo/store';
import { ChatAction, ChatActionUnion } from './chat.actions';
import { chatAtom } from './chat.atoms';
import { ChatReducerContext } from './chat.reducer';

export interface Connected {
  type: 'CONNECTED';
  connection: WebSocket;
}

export interface Connecting {
  type: 'CONNECTING';
  retry: number;
}

export interface Closed {
  type: 'CLOSED';
  retry: number;
  countdown: number;
}

export type ConnectionState = Connected | Connecting | Closed;

export const initialConnectionState: ConnectionState = {
  type: 'CLOSED',
  retry: 0,
  countdown: 0,
};

const handleConnected = (
  state: ConnectionState,
  action: ChatAction<'connected'>,
  mailboxId: string,
): ConnectionState => {
  if (mailboxId && action.payload.mailboxId !== mailboxId) {
    return state;
  }
  return { type: 'CONNECTED', connection: action.payload.connection };
};

const handleConnecting = (
  state: ConnectionState,
  action: ChatAction<'connecting'>,
  mailboxId: string,
): ConnectionState => {
  if (mailboxId && action.payload.mailboxId !== mailboxId) {
    return state;
  }
  let retry = 0;
  if (state.type === 'CLOSED') {
    retry = state.retry + 1;
  }
  return { type: 'CONNECTING', retry };
};

const RETRY_COUNTDOWN = [0, 0, 2, 3, 3, 5, 3, 5, 7];

const handleConnectionClosed = (
  state: ConnectionState,
  { payload }: ChatAction<'connectionClosed'>,
  mailboxId: string,
): ConnectionState => {
  if (mailboxId && payload.mailboxId !== mailboxId) {
    return state;
  }
  let retry = 0;
  if (state.type === 'CONNECTING') {
    retry = state.retry;
  }
  let countdown = 0;
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
  return { type: 'CLOSED', retry, countdown };
};

const handleReconnectCountdownTick = (
  connection: ConnectionState,
  { payload: { immediately = false } }: ChatAction<'reconnectCountdownTick'>,
): ConnectionState => {
  if (connection.type !== 'CLOSED') {
    return connection;
  }
  const countdown = immediately ? 0 : connection.countdown - 1;
  return { ...connection, countdown };
};

const handleDebugCloseConnection = (
  state: ConnectionState,
  { payload: { countdown } }: ChatAction<'debugCloseConnection'>,
): ConnectionState => {
  if (state.type === 'CONNECTED') {
    state.connection.onclose = null;
    state.connection.close();
  }
  return { type: 'CLOSED', retry: 4, countdown };
};

export const connectionReducer = (
  state: ConnectionState,
  action: ChatActionUnion,
  { spaceId: mailboxId }: ChatReducerContext,
): ConnectionState => {
  switch (action.type) {
    case 'connected':
      return handleConnected(state, action, mailboxId);
    case 'connecting':
      return handleConnecting(state, action, mailboxId);
    case 'connectionClosed':
      return handleConnectionClosed(state, action, mailboxId);
    case 'reconnectCountdownTick':
      return handleReconnectCountdownTick(state, action);
    case 'debugCloseConnection':
      return handleDebugCloseConnection(state, action);
  }
  return state;
};

export const getConnection = (): WebSocket | null => {
  const chatState = store.get(chatAtom);
  if (chatState.connection.type !== 'CONNECTED') {
    return null;
  }
  return chatState.connection.connection;
};
