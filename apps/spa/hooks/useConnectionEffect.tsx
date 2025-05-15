import { type ChannelMembers, type EventId, type Update, type UserStatus } from '@boluo/api';
import { isServerUpdate } from '@boluo/api/events';
import { webSocketUrlAtom } from '@boluo/common';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useCallback, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { isUuid } from '@boluo/utils';
import { PING, PONG } from '../const';
import { chatAtom, type ChatDispatch, connectionStateAtom } from '../state/chat.atoms';
import { type ConnectionState } from '../state/connection.reducer';
import { recordError } from '../error';

let lastPongTime = Date.now();
const RELOAD_TIMEOUT = 1000 * 60 * 30;

const createMailboxConnection = (
  baseUrl: string,
  id: string,
  token?: string | null,
  after?: EventId,
): WebSocket => {
  const paramsObject: Record<string, string> = { mailbox: id };
  if (token) paramsObject.token = token;
  if (after) {
    paramsObject.after = after.timestamp.toString();
    paramsObject.seq = after.seq.toString();
  }
  const params = new URLSearchParams(paramsObject);
  const url = `${baseUrl}/events/connect?${params.toString()}`;
  return new WebSocket(url);
};

const connect = (
  webSocketEndpoint: string,
  mailboxId: string,
  connectionState: ConnectionState,
  after: EventId,
  onUpdateReceived: (update: Update) => void,
  dispatch: ChatDispatch,
  token: string | undefined | null,
): WebSocket | null => {
  if (!isUuid(mailboxId)) return null;
  if (connectionState.type !== 'CLOSED') return null;
  if (connectionState.countdown > 0) {
    setTimeout(() => dispatch({ type: 'reconnectCountdownTick', payload: {} }), 1000);
    return null;
  }
  if (Date.now() - lastPongTime > RELOAD_TIMEOUT) {
    alert('Connection lost due to inactivity.');
    dispatch({ type: 'resetChatState', payload: {} });
    return null;
  }
  dispatch({ type: 'connecting', payload: { mailboxId } });

  const newConnection = createMailboxConnection(webSocketEndpoint, mailboxId, token, after);
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

export const useConnectionEffect = (
  mailboxId: string,
  isTokenLoading: boolean,
  token: string | undefined | null,
) => {
  const { mutate } = useSWRConfig();
  const webSocketEndpoint = useAtomValue(webSocketUrlAtom);
  const store = useStore();
  const dispatch = useSetAtom(chatAtom);

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
    if (isTokenLoading) return;
    const chatState = store.get(chatAtom);
    let ws: WebSocket | null = null;
    const unsub = store.sub(connectionStateAtom, () => {
      const chatState = store.get(chatAtom);
      ws = connect(
        webSocketEndpoint,
        mailboxId,
        chatState.connection,
        chatState.lastEventId,
        onUpdateReceived,
        dispatch,
        token,
      );
    });
    const handle = window.setTimeout(() => {
      if (ws == null) {
        ws = connect(
          webSocketEndpoint,
          mailboxId,
          chatState.connection,
          chatState.lastEventId,
          onUpdateReceived,
          dispatch,
          token,
        );
      }
    });
    return () => {
      window.clearTimeout(handle);
      unsub();
      if (ws) ws.close();
    };
  }, [onUpdateReceived, mailboxId, store, webSocketEndpoint, dispatch, token, isTokenLoading]);
};
