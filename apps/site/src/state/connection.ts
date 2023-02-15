import type { Action } from './actions';
import type { ChatReducerContext } from './chat';

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
  action: Action,
  { spaceId: mailboxId }: ChatReducerContext,
): ConnectionState => {
  if (action.type === 'CONNECTED') {
    if (mailboxId && action.mailboxId !== mailboxId) {
      return state;
    }
    return { type: 'CONNECTED', connection: action.connection };
  }
  if (action.type === 'CONNECTING') {
    if (mailboxId && action.mailboxId !== mailboxId) {
      return state;
    }
    let retry = 0;
    if (state.type === 'CLOSED') {
      retry = state.retry + 1;
    }
    return { type: 'CONNECTING', retry };
  }
  if (action.type === 'CONNECTION_CLOSED') {
    if (mailboxId && action.mailboxId !== mailboxId) {
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
