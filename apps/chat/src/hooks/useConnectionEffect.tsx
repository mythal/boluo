import { isServerEvent } from 'api';
import { webSocketUrlAtom } from 'common';
import { useStore } from 'jotai';
import { useEffect } from 'react';
import { isUuid } from 'utils';
import { PING, PONG } from '../const';
import { makeAction } from '../state/actions';
import { chatAtom, connectionStateAtom } from '../state/chat.atoms';

const createMailboxConnection = (baseUrl: string, id: string): WebSocket => {
  const url = `${baseUrl}/events/connect?mailbox=${id}`;
  return new WebSocket(url);
};

const connect = (store: ReturnType<typeof useStore>) => {
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

  const newConnection = createMailboxConnection(webSocketEndpoint, mailboxId);
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
  };
};

export const useConnectionEffect = () => {
  const store = useStore();
  useEffect(() => {
    connect(store);
    return store.sub(connectionStateAtom, () => {
      connect(store);
    });
  }, [store]);
};
