import {
  type MakeToken,
  type ChannelMembers,
  type EventId,
  type Update,
  type UserStatus,
} from '@boluo/api';
import { isServerUpdate } from '@boluo/api/events';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { webSocketUrlAtom } from '@boluo/hooks/useWebSocketUrl';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useCallback, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { isUuid } from '@boluo/utils/id';
import { PING, PONG } from '../const';
import { chatAtom, type ChatDispatch, connectionStateAtom } from '../state/chat.atoms';
import { type ConnectionState } from '../state/connection.reducer';
import { get } from '@boluo/api-browser';
import { type IntlShape, useIntl } from 'react-intl';
import { sleep } from '@boluo/utils/async';
import { useLogout } from '@boluo/hooks/useLogout';

let lastPongTime = Date.now();
const RELOAD_TIMEOUT = 1000 * 60 * 30;

const UNAUTHENTICATED = 'UNAUTHENTICATED';
const NETWORK_ERROR = 'NETWORK_ERROR';
const UNEXPECTED = 'UNEXPECTED';
type ConnectionError = 'UNAUTHENTICATED' | 'NETWORK_ERROR' | 'UNEXPECTED';

const SLEEP_MS = [0, 32, 64, 126, 256, 256, 512, 1024, 512];
const MAX_ATTEMPTS = 11;
const getToken = async (
  makeToken: MakeToken,
): Promise<{ token: string; timestamp: number } | ConnectionError> => {
  let errorCode: ConnectionError | null = null;
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

const connect = async (
  intl: IntlShape,
  webSocketEndpoint: string,
  mailboxId: string,
  userId: string | null,
  connectionState: ConnectionState,
  cursor: EventId,
  onUpdateReceived: (update: Update) => void,
  dispatch: ChatDispatch,
): Promise<WebSocket | ConnectionError | null> => {
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
  if (
    tokenResult === UNAUTHENTICATED ||
    tokenResult === NETWORK_ERROR ||
    tokenResult === UNEXPECTED
  ) {
    const code = tokenResult === UNAUTHENTICATED ? 'INVALID_TOKEN' : 'UNEXPECTED';
    dispatch({ type: 'connectionError', payload: { mailboxId, code } });
    return tokenResult;
  }

  if (Date.now() - tokenResult.timestamp > 1000 * 10) {
    dispatch({ type: 'connectionError', payload: { mailboxId, code: 'UNEXPECTED' } });
    return 'UNEXPECTED';
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
    onUpdateReceived(update);
  };
  return newConnection;
};

export const useConnectionEffect = (mailboxId: string) => {
  const logout = useLogout();
  const { mutate } = useSWRConfig();
  const { data: user, isLoading: isQueryingUser } = useQueryCurrentUser();
  const webSocketEndpoint = useAtomValue(webSocketUrlAtom);
  const userId = user?.id ?? null;
  const store = useStore();
  const dispatch = useSetAtom(chatAtom);
  const intl = useIntl();
  const onUpdateReceived = useCallback(
    (update: Update) => {
      switch (update.body.type) {
        case 'CHANNEL_DELETED':
          void mutate(['/channels/by_space', update.mailbox]);
          void mutate(['/channels/query', update.body.channelId]);
          return;
        case 'CHANNEL_EDITED':
          void mutate(['/channels/by_space', update.mailbox]);
          void mutate(['/channels/query', update.body.channelId], update.body.channel);
          return;
        case 'SPACE_UPDATED': {
          const { space } = update.body.spaceWithRelated;
          void mutate(['/spaces/query', space.id], space);
          void mutate(['/channels/by_space', space.id]);
          return;
        }
        case 'MEMBERS': {
          const members = update.body.members;
          void mutate<ChannelMembers>(
            ['/channels/members', update.body.channelId],
            (channelMembers) => {
              if (channelMembers != null) {
                return { ...channelMembers, members };
              }
            },
          );
          return;
        }
        case 'STATUS_MAP':
          void mutate<Record<string, UserStatus | undefined>>(
            ['/spaces/users_status', update.body.spaceId],
            update.body.statusMap,
          );
          return;
        case 'ERROR':
          if (update.body.code === 'NOT_FOUND') {
            dispatch({ type: 'resetChatState', payload: {} });
            return;
          }
          dispatch({
            type: 'connectionError',
            payload: { mailboxId, code: update.body.code ?? 'UNEXPECTED' },
          });
          return;
        case 'NEW_MESSAGE':
        case 'MESSAGE_DELETED':
        case 'MESSAGE_EDITED':
        case 'MESSAGE_PREVIEW':
        case 'INITIALIZED':
        case 'APP_INFO':
          return;
      }
    },
    [dispatch, mailboxId, mutate],
  );

  useEffect(() => {
    if (mailboxId === '') return;
    if (isQueryingUser) return;
    let currentConnection: WebSocket | null = null;
    const performConnect = () => {
      const chatState = store.get(chatAtom);
      void connect(
        intl,
        webSocketEndpoint,
        mailboxId,
        userId,
        chatState.connection,
        chatState.cursor,
        onUpdateReceived,
        dispatch,
      ).then((connectionResult) => {
        if (connectionResult == null) return;
        if (connectionResult === NETWORK_ERROR) {
          alert(
            intl.formatMessage({
              defaultMessage:
                'Failed to establish connection due to a network error. Please try again later.',
            }),
          );
          return;
        } else if (connectionResult === UNAUTHENTICATED) {
          if (userId != null) {
            if (
              confirm(
                intl.formatMessage({
                  defaultMessage:
                    'The session is invalid. Re-login may help to resolve this issue. Do you want to log out now?',
                }),
              )
            ) {
              logout();
            }
          } else {
            alert(
              intl.formatMessage({
                defaultMessage: 'You are not authenticated. Please log in to access this resource.',
              }),
            );
          }
          return;
        } else if (connectionResult === UNEXPECTED) {
          alert(
            intl.formatMessage({
              defaultMessage:
                'An unexpected error occurred while establishing the connection. Please try again later.',
            }),
          );
          return;
        }
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
  }, [
    onUpdateReceived,
    userId,
    mailboxId,
    store,
    webSocketEndpoint,
    dispatch,
    isQueryingUser,
    intl,
    logout,
  ]);
};
