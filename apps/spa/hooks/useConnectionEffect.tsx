import { type MakeToken, type EventId } from '@boluo/api';
import { isServerUpdate } from '@boluo/api/events';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { webSocketUrlAtom } from '@boluo/hooks/useWebSocketUrl';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useEffect, useRef } from 'react';
import { isUuid } from '@boluo/utils/id';
import { PING, PONG } from '../const';
import { chatAtom, type ChatDispatch, connectionStateAtom } from '../state/chat.atoms';
import { type ConnectionState } from '../state/connection.reducer';
import { get } from '@boluo/api-browser';
import { sleep } from '@boluo/utils/async';
import { useLogout } from '@boluo/hooks/useLogout';
import { type ClientConnectionError } from '../state/chat.actions';

let lastPongTime = Date.now();
const RELOAD_TIMEOUT = 1000 * 60 * 30;

const UNAUTHENTICATED = 'UNAUTHENTICATED';
const NETWORK_ERROR = 'NETWORK_ERROR';
const UNEXPECTED = 'UNEXPECTED';

const SLEEP_MS = [0, 32, 64, 126, 256, 256, 512, 1024, 512];
const MAX_ATTEMPTS = 11;
const getToken = async (
  makeToken: MakeToken,
): Promise<{ token: string; timestamp: number } | ClientConnectionError> => {
  let errorCode: ClientConnectionError | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sleepMs = SLEEP_MS[Math.min(attempt, SLEEP_MS.length - 1)]!;
    if (sleepMs > 0) {
      await sleep(sleepMs);
    }
    const tokenResult = await get('/events/token', makeToken);
    if (tokenResult.isOk) {
      return { token: tokenResult.some.token, timestamp: Date.now() };
    }
    const err = tokenResult.err;
    if (err.code === 'UNAUTHENTICATED') {
      errorCode = UNAUTHENTICATED;
      continue;
    } else if (err.code === 'NO_PERMISSION') {
      errorCode = 'NO_PERMISSION';
      break;
    } else if (err.code === 'FETCH_FAIL') {
      errorCode = NETWORK_ERROR;
      continue;
    } else {
      console.error('Unexpected error when getting event token', err);
      errorCode = 'UNEXPECTED';
      break;
    }
  }
  return errorCode ?? 'UNEXPECTED';
};

const buildWebsocket = (
  baseUrl: string,
  id: string,
  userId: string | null,
  token: string,
  cursor?: EventId,
): WebSocket => {
  const paramsObject: Record<string, string> = { mailbox: id };
  paramsObject.token = token;
  if (cursor) {
    paramsObject.after = cursor.timestamp.toString();
    paramsObject.node = cursor.node.toString();
    paramsObject.seq = cursor.seq.toString();
  }
  if (userId != null) paramsObject.userId = userId;
  const params = new URLSearchParams(paramsObject);
  const url = `${baseUrl}/events/connect?${params.toString()}`;
  return new WebSocket(url);
};

const TOKEN_SPAN = 'CLIENT';

const connect = async (
  webSocketEndpoint: string,
  mailboxId: string,
  userId: string | null,
  connectionState: ConnectionState,
  cursor: EventId,
  dispatch: ChatDispatch,
): Promise<WebSocket | null> => {
  if (!isUuid(mailboxId)) return null;
  if (connectionState.type !== 'CLOSED') return null;
  if (connectionState.countdown > 0) {
    setTimeout(() => dispatch({ type: 'reconnectCountdownTick', payload: {} }), 1000);
    return null;
  }
  if (Date.now() - lastPongTime > RELOAD_TIMEOUT) {
    lastPongTime = Date.now();
    dispatch({ type: 'resetChatState', payload: {} });
    return null;
  }
  dispatch({ type: 'connecting', payload: { mailboxId } });
  const tokenResult = await getToken({ spaceId: mailboxId, userId });
  if (typeof tokenResult === 'string') {
    dispatch({
      type: 'connectionError',
      payload: { mailboxId, code: tokenResult, span: TOKEN_SPAN, timestamp: Date.now() },
    });
    return null;
  }

  if (Date.now() - tokenResult.timestamp > 1000 * 10) {
    dispatch({
      type: 'connectionError',
      payload: { mailboxId, code: UNEXPECTED, span: TOKEN_SPAN, timestamp: tokenResult.timestamp },
    });
    return null;
  }
  const newConnection = buildWebsocket(
    webSocketEndpoint,
    mailboxId,
    userId,
    tokenResult.token,
    cursor,
  );
  newConnection.onopen = (_) => {
    console.info(`connection established for ${mailboxId}`);
    dispatch({ type: 'connected', payload: { connection: newConnection, mailboxId } });
  };
  newConnection.onclose = (event) => {
    console.info(`connection closed for ${mailboxId}`, event);
    dispatch({ type: 'connectionClosed', payload: { mailboxId, random: Math.random() } });
  };
  newConnection.onmessage = (message: MessageEvent<unknown>) => {
    const raw = message.data;
    if (raw === PING) {
      newConnection.send(PONG);
      lastPongTime = Date.now();
      return;
    } else if (raw === PONG) {
      return;
    } else if (!raw || typeof raw !== 'string') {
      console.warn('Invalid message received', mailboxId, raw);
      return;
    }

    let update: unknown = null;
    try {
      update = JSON.parse(raw);
    } catch {
      console.warn('Failed to parse incoming message', mailboxId, raw);
      return;
    }
    if (!isServerUpdate(update)) {
      console.warn('Received invalid update', mailboxId, update);
      return;
    }
    dispatch({ type: 'update', payload: update });
  };
  return newConnection;
};

export const useConnectionEffect = (mailboxId: string) => {
  const { data: user, isLoading: isQueryingUser } = useQueryCurrentUser();
  const webSocketEndpoint = useAtomValue(webSocketUrlAtom);
  const connectionState = useAtomValue(connectionStateAtom);
  const userId = user?.id ?? null;
  const store = useStore();
  const logout = useLogout();
  const handledUnauthenticatedRef = useRef<number | null>(null);
  const dispatch = useSetAtom(chatAtom);

  useEffect(() => {
    if (connectionState.type !== 'ERROR') return;
    if (connectionState.code !== UNAUTHENTICATED) return;
    if (handledUnauthenticatedRef.current === connectionState.timestamp) return;
    handledUnauthenticatedRef.current = connectionState.timestamp;
    if (user == null) return;
    if (confirm("Your session has expired. You'll be logged out now.")) {
      logout();
    }
  }, [connectionState, logout, user]);

  useEffect(() => {
    if (mailboxId === '') return;
    if (isQueryingUser) return;
    let currentConnection: WebSocket | null = null;
    const performConnect = () => {
      const chatState = store.get(chatAtom);
      void connect(
        webSocketEndpoint,
        mailboxId,
        userId,
        chatState.connection,
        chatState.cursor,
        dispatch,
      ).then((connectionResult) => {
        currentConnection = connectionResult;
      });
    };
    const unsub = store.sub(connectionStateAtom, () => {
      performConnect();
    });
    // The `store.sub` only triggers when the state changes,
    // so we need to call `performConnect` immediately.
    const handle = window.setTimeout(() => {
      if (currentConnection == null) {
        performConnect();
      }
    }, 0);
    return () => {
      window.clearTimeout(handle);
      unsub();
      if (currentConnection) currentConnection.close();
    };
  }, [dispatch, isQueryingUser, mailboxId, store, userId, webSocketEndpoint]);
};
