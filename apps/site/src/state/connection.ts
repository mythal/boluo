import { ChatActionUnion } from './actions/chat';
import { chatAtom } from './atoms/chat';
import { ChatReducerContext } from './chat';
import { store } from './store';

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
}

export type ConnectionState = Connected | Connecting | Closed;

export const initialConnectionState: ConnectionState = {
  type: 'CLOSED',
  retry: 0,
};

export const connectionReducer = (
  state: ConnectionState,
  action: ChatActionUnion,
  { spaceId: mailboxId }: ChatReducerContext,
): ConnectionState => {
  if (action.type === 'connected') {
    if (mailboxId && action.payload.mailboxId !== mailboxId) {
      return state;
    }
    return { type: 'CONNECTED', connection: action.payload.connection };
  }
  if (action.type === 'connecting') {
    if (mailboxId && action.payload.mailboxId !== mailboxId) {
      return state;
    }
    let retry = 0;
    if (state.type === 'CLOSED') {
      retry = state.retry + 1;
    }
    return { type: 'CONNECTING', retry };
  }
  if (action.type === 'connectionClosed') {
    if (mailboxId && action.payload.mailboxId !== mailboxId) {
      return state;
    }
    let retry = 0;
    if (state.type === 'CONNECTING') {
      retry = state.retry;
    }
    return { type: 'CLOSED', retry };
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
