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

let lastPongTime = Date.now();
const RELOAD_TIMEOUT = 1000 * 60 * 30;

const UNAUTHENTICATED = 'UNAUTHENTICATED';
const NETWORK_ERROR = 'NETWORK_ERROR';
type ConnectionError = 'UNAUTHENTICATED' | 'NETWORK_ERROR';

const SLEEP_MS = [0, 7, 17, 37];

const getToken = async (
  makeToken: MakeToken,
  retryCount: number = 0,
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
): Promise<string | ConnectionError> => {
  const token = await get('/events/token', makeToken);
  if (token.isOk) return token.some.token;
  const err = token.err;
  if (err.code === 'UNAUTHENTICATED') {
    return 'UNAUTHENTICATED';
  } else if (err.code === 'FETCH_FAIL') {
    if (retryCount >= SLEEP_MS.length) return NETWORK_ERROR;
    await new Promise((resolve) => setTimeout(resolve, SLEEP_MS[retryCount]));
    return await getToken(makeToken, retryCount + 1);
  } else {
    throw new Error('Failed to get connection token', { cause: err });
  }
};

const createMailboxConnection = async (
  baseUrl: string,
  id: string,
  userId: string | null,
  after?: EventId,
): Promise<WebSocket | ConnectionError> => {
  const paramsObject: Record<string, string> = { mailbox: id };
  const token = await getToken({ spaceId: id, userId });
  if (token === 'UNAUTHENTICATED' || token === 'NETWORK_ERROR') return token;
  if (token) paramsObject.token = token;
  if (after) {
    paramsObject.after = after.timestamp.toString();
    paramsObject.node = after.node.toString();
    paramsObject.seq = after.seq.toString();
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
  after: EventId,
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
    alert(
      intl.formatMessage({
        defaultMessage: 'Connection lost due to inactivity, please refresh the page.',
      }),
    );
    dispatch({ type: 'resetChatState', payload: {} });
    return null;
  }
  dispatch({ type: 'connecting', payload: { mailboxId } });

  const newConnection = await createMailboxConnection(webSocketEndpoint, mailboxId, userId, after);
  if (newConnection === UNAUTHENTICATED || newConnection === NETWORK_ERROR) return newConnection;
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
    }
    if (!raw || typeof raw !== 'string' || raw === PONG) return;

    let update: unknown = null;
    try {
      update = JSON.parse(raw);
    } catch {
      return;
    }
    if (!isServerUpdate(update)) return;
    let updates: Update[];

    dispatch({ type: 'update', payload: update });
    onUpdateReceived(update);
  };
  return newConnection;
};

export const useConnectionEffect = (mailboxId: string) => {
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
            alert(
              'Cannot find the requested updates. This may be because the client has been offline for a long time or the server has restarted. Please refresh the page.',
            );
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
        chatState.lastEventId,
        onUpdateReceived,
        dispatch,
      ).then((connectionResult) => {
        if (connectionResult == null) return;
        if (connectionResult === NETWORK_ERROR) {
          alert('Failed to establish connection due to a network error. Please try again later.');
          return;
        } else if (connectionResult === UNAUTHENTICATED) {
          alert(
            'The session is invalid. Please clear your cache or try a different browser. This is unexpected behavior; please report this issue.',
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
    });
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
  ]);
};
