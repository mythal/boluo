import { ChannelMembers, EventId, isServerEvent, ServerEvent } from 'api';
import { webSocketUrlAtom } from 'common';
import { useStore } from 'jotai';
import { useCallback, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { isUuid } from 'utils';
import { PING, PONG } from '../const';
import { makeAction } from '../state/actions';
import { chatAtom, connectionStateAtom } from '../state/chat.atoms';

const createMailboxConnection = (baseUrl: string, id: string, token?: string, after?: EventId): WebSocket => {
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

const connect = (store: ReturnType<typeof useStore>, handleEvent: (event: ServerEvent) => void) => {
  const { spaceId: mailboxId } = store.get(chatAtom).context;
  if (!isUuid(mailboxId)) return;
  const webSocketEndpoint = store.get(webSocketUrlAtom);
  const connectionState = store.get(connectionStateAtom);
  if (connectionState.type !== 'CLOSED') return;
  if (connectionState.countdown > 0) {
    setTimeout(() => store.set(chatAtom, makeAction('reconnectCountdownTick', {}, undefined)), 1000);
    return;
  }
  console.info(`establishing new connection for ${mailboxId}`);
  store.set(chatAtom, makeAction('connecting', { mailboxId }, undefined));

  const after = store.get(chatAtom).lastEventId;
  const newConnection = createMailboxConnection(webSocketEndpoint, mailboxId, undefined, after);
  newConnection.onopen = (_) => {
    console.info(`connection established for ${mailboxId}`);
    store.set(chatAtom, makeAction('connected', { connection: newConnection, mailboxId }, undefined));
  };
  newConnection.onclose = (event) => {
    console.info(`connection closed for ${mailboxId}`, event);
    store.set(chatAtom, makeAction('connectionClosed', { mailboxId, random: Math.random() }, undefined));
  };
  newConnection.onmessage = (message: MessageEvent<unknown>) => {
    const raw = message.data;
    if (raw === PING) {
      newConnection.send(PONG);
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
    store.set(chatAtom, makeAction('eventFromServer', event, undefined));
    handleEvent(event);
  };
};

export const useConnectionEffect = () => {
  const { mutate } = useSWRConfig();
  const store = useStore();

  const handleEvent = useCallback((event: ServerEvent) => {
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
        const { space, channelMembers, channels } = event.body.spaceWithRelated;
        void mutate(['/spaces/query', space.id], space);
        void mutate(['/channels/by_space', space.id]);
        return;
      case 'MEMBERS':
        const members = event.body.members;
        void mutate<ChannelMembers>(
          ['/channels/members', event.body.channelId],
          (channelMembers) => {
            if (channelMembers != null) {
              return { ...channelMembers, members };
            }
          },
        );
        return;
      case 'NEW_MESSAGE':
      case 'MESSAGE_DELETED':
      case 'MESSAGE_EDITED':
      case 'MESSAGE_PREVIEW':
      case 'INITIALIZED':
      case 'STATUS_MAP':
      case 'APP_UPDATED':
        return;
    }
  }, [mutate]);

  useEffect(() => {
    connect(store, handleEvent);
    return store.sub(connectionStateAtom, () => {
      connect(store, handleEvent);
    });
  }, [handleEvent, store]);
};
