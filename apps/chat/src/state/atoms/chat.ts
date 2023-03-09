import { isServerEvent } from 'api';
import { webSocketUrlAtom } from 'common/hooks/useWebSocketUrl';
import { store } from 'common/store';
import { useSetAtom } from 'jotai';
import { atomWithReducer, selectAtom } from 'jotai/utils';
import { PING, PONG } from '../../const';
import { makeAction } from '../actions/actions';
import { ChatActionUnion, eventToChatAction, makeChatAction } from '../actions/chat';
import { chatReducer, ChatSpaceState, initialChatState } from '../chat';

export const chatAtom = atomWithReducer<ChatSpaceState, ChatActionUnion>(initialChatState, chatReducer);

const createMailboxConnection = (baseUrl: string, id: string): WebSocket => {
  return new WebSocket(`${baseUrl}/events/connect?mailbox=${id}`);
};

const LOG_CHAT_STATE = false;

store.sub(chatAtom, () => {
  if (LOG_CHAT_STATE) {
    const chatState = store.get(chatAtom);
    console.log('state', chatState);
  }
});

export type ChatDispatch = <A extends ChatActionUnion>(type: A['type'], payload: A['payload']) => void;

export const useChatDispatch = (): ChatDispatch => {
  const set = useSetAtom(chatAtom);
  return <A extends ChatActionUnion>(type: A['type'], payload: A['payload']) => set(makeChatAction(type, payload));
};

export const connectionStateAtom = selectAtom(chatAtom, (chatState) => chatState.connection);

store.sub(connectionStateAtom, () => {
  const connectionState = store.get(connectionStateAtom);
  if (connectionState.type !== 'CLOSED') {
    return;
  }
  const { spaceId: mailboxId } = store.get(chatAtom).context;
  console.debug(`establish new connection for ${mailboxId}`);
  store.set(chatAtom, makeAction('connecting', { mailboxId }, undefined));
  const newConnection = createMailboxConnection(store.get(webSocketUrlAtom), mailboxId);
  newConnection.onopen = (_) => {
    store.set(chatAtom, makeAction('connected', { connection: newConnection, mailboxId }, undefined));
  };
  newConnection.onclose = (_) => {
    store.set(chatAtom, makeAction('connectionClosed', { mailboxId }, undefined));
  };
  newConnection.onmessage = (message: MessageEvent<unknown>) => {
    const raw = message.data;
    if (raw === PING) {
      newConnection.send(PONG);
      return;
    }
    if (!raw || typeof raw !== 'string' || raw === PONG) {
      return;
    }

    let event: unknown = null;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    if (!isServerEvent(event)) {
      return;
    }
    const action = eventToChatAction(event);
    if (!action) {
      return;
    }
    store.set(chatAtom, action);
  };
});
