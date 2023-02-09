import type { Event } from 'boluo-api';
import { createContext, useEffect, useReducer, useRef, useState } from 'react';
import { BACKEND_HOST } from '../const';

export const PING = '♥';
export const PONG = '♡';

export interface Connected {
  type: 'CONNECTED';
  connection: WebSocket;
}

export interface Connecting {
  type: 'CONNECTING';
  retry: number;
  connection: WebSocket;
}

export interface Closed {
  type: 'CLOSED';
  retry: number;
}

export type ConnectionState = Connected | Connecting | Closed;

export const initState: ConnectionState = {
  type: 'CLOSED',
  retry: 0,
};

interface Close {
  type: 'CLOSE';
}

interface StartConnect {
  type: 'START_CONNECT';
  connection: WebSocket;
}

interface Open {
  type: 'OPEN';
}

type Action = Close | StartConnect | Open;

const reducer = (state: ConnectionState, action: Action): ConnectionState => {
  let retry = 0;
  switch (action.type) {
    case 'CLOSE':
      if (state.type !== 'CONNECTED') {
        retry = state.retry;
      } else {
        state.connection.close(1000);
      }
      return { type: 'CLOSED', retry: retry + 1 };
    case 'OPEN':
      if (state.type === 'CONNECTED') {
        return state;
      } else if (state.type === 'CONNECTING') {
        return { type: 'CONNECTED', connection: state.connection };
      } else {
        return { type: 'CLOSED', retry };
      }
    case 'START_CONNECT':
      if (state.type !== 'CLOSED') {
        state.connection.close(1000);
      }
      return { type: 'CONNECTING', retry, connection: action.connection };
    default:
      return state;
  }
};

const createMailboxConnection = (id: string): WebSocket => {
  const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:';

  return new WebSocket(`${protocol}//${BACKEND_HOST}/events/connect?mailbox=${id}`);
};

export const useConnectionState = (mailboxId: string): ConnectionState => {
  const [state, dispatch] = useReducer(reducer, initState);
  useEffect(() => {
    if (state.type === 'CLOSED') {
      const connect = () => {
        const newConnection = createMailboxConnection(mailboxId);
        newConnection.onopen = (e) => {
          dispatch({ type: 'OPEN' });
        };
        newConnection.onclose = (e) => {
          console.log('WebSocket closed: ', e);
          dispatch({ type: 'CLOSE' });
        };
        newConnection.onerror = (e) => {
          console.warn('An error occurred while WebSocket connecting:', e);
        };
        dispatch({ type: 'START_CONNECT', connection: newConnection });
        return newConnection;
      };
      if (state.retry === 0) {
        const handle = window.setTimeout(connect, 0);
        return () => window.clearTimeout(handle);
      } else {
        const handle = window.setTimeout(connect, state.retry * 1000);
        return () => window.clearTimeout(handle);
      }
    }
  }, [state, mailboxId]);

  useEffect(() => {
    if (state.type !== 'CONNECTED') {
      return;
    }

    const onMessage = (ev: MessageEvent) => {
      if (ev.data === PING) {
        state.connection.send(PONG);
      }
    };
    state.connection.addEventListener('message', onMessage);
    return () => state.connection.removeEventListener('message', onMessage);
  }, [state]);

  useEffect(() => console.debug('connection state', state), [state]);
  return state;
};

export const createConnectionStateContext = () => createContext<ConnectionState>(initState);

export const useChatEvent = (state: ConnectionState, onEvent: (event: Event) => void) => {
  useEffect(() => {
    if (state.type === 'CLOSED') {
      return;
    }
    const onMessage = (e: MessageEvent<unknown>) => {
      const raw = e.data;
      if (!raw || typeof raw !== 'string' || raw === PING || raw === PONG) {
        return;
      }
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (typeof parsed !== 'object' || !parsed || !('body' in parsed)) {
        return;
      }
      onEvent(parsed as Event);
    };
    const { connection } = state;
    connection.addEventListener('message', onMessage);
    return () => connection.removeEventListener('message', onMessage);
  }, [state, onEvent]);
};
