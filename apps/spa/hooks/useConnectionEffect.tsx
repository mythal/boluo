import { type ChannelMembers, type EventId, isServerEvent, type ServerEvent, type UserStatus } from '@boluo/api';
import { webSocketUrlAtom } from '@boluo/common';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useCallback, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { isUuid } from '@boluo/utils';
import { PING, PONG } from '../const';
import { chatAtom, type ChatDispatch, connectionStateAtom } from '../state/chat.atoms';
import { type ConnectionState } from '../state/connection.reducer';

let lastPongTime = Date.now();
const RELOAD_TIMEOUT = 1000 * 60 * 30;

const createMailboxConnection = (baseUrl: string, id: string, token?: string | null, after?: EventId): WebSocket => {
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
  onEvent: (event: ServerEvent) => void,
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

    let event: unknown = null;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    if (!isServerEvent(event)) return;
    dispatch({ type: 'eventFromServer', payload: event });
    onEvent(event);
  };
  return newConnection;
};

export const useConnectionEffect = (mailboxId: string, isTokenLoading: boolean, token: string | undefined | null) => {
  const { mutate } = useSWRConfig();
  const webSocketEndpoint = useAtomValue(webSocketUrlAtom);
  const store = useStore();
  const dispatch = useSetAtom(chatAtom);

  const onEvent = useCallback(
    (event: ServerEvent) => {
      switch (event.body.type) {
        case 'CHANNEL_DELETED':
          void mutate(['/channels/by_space', event.mailbox]);
          void mutate(['/channels/query', event.body.channelId]);
          return;
        case 'CHANNEL_EDITED':
          void mutate(['/channels/by_space', event.mailbox]);
          void mutate(['/channels/query', event.body.channelId], event.body.channel);
          return;
        case 'SPACE_UPDATED':
          const { space } = event.body.spaceWithRelated;
          void mutate(['/spaces/query', space.id], space);
          void mutate(['/channels/by_space', space.id]);
          return;
        case 'MEMBERS':
          const members = event.body.members;
          void mutate<ChannelMembers>(['/channels/members', event.body.channelId], (channelMembers) => {
            if (channelMembers != null) {
              return { ...channelMembers, members };
            }
          });
          return;
        case 'STATUS_MAP':
          void mutate<Record<string, UserStatus>>(['/spaces/users_status', event.body.spaceId], event.body.statusMap);
          return;
        case 'ERROR':
          dispatch({ type: 'connectionError', payload: { mailboxId, code: event.body.code ?? 'UNEXPECTED' } });
          return;
        case 'BATCH':
        case 'NEW_MESSAGE':
        case 'MESSAGE_DELETED':
        case 'MESSAGE_EDITED':
        case 'MESSAGE_PREVIEW':
        case 'INITIALIZED':
        case 'APP_UPDATED':
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
      ws = connect(webSocketEndpoint, mailboxId, chatState.connection, chatState.lastEventId, onEvent, dispatch, token);
    });
    const handle = window.setTimeout(() => {
      if (ws == null) {
        ws = connect(
          webSocketEndpoint,
          mailboxId,
          chatState.connection,
          chatState.lastEventId,
          onEvent,
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
  }, [onEvent, mailboxId, store, webSocketEndpoint, dispatch, token, isTokenLoading]);
};
