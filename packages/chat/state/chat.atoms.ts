import { apiUrlAtom } from 'api-browser';
import { atom, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { store } from 'store';
import { ChatActionUnion, makeChatAction } from './chat.actions';
import { chatReducer, ChatSpaceState, initialChatState, makeChatState } from './chat.reducer';
import { routeAtom } from './view.atoms';

const baseChatAtom = atom(initialChatState);

export const chatAtom = atom<ChatSpaceState, [ChatActionUnion], void>(
  get => {
    const route = get(routeAtom);
    const chat = get(baseChatAtom);
    if (route.type === 'SPACE') {
      if (route.spaceId === chat.context.spaceId) {
        return chat;
      } else {
        return makeChatState(route.spaceId);
      }
    } else {
      return initialChatState;
    }
  },
  (get, set, action) => {
    let chat = get(baseChatAtom);
    const route = get(routeAtom);
    if (route.type === 'SPACE') {
      if (route.spaceId !== chat.context.spaceId) {
        chat = makeChatState(route.spaceId);
      }
    }
    const newState = chatReducer(chat, action);
    set(baseChatAtom, newState);
  },
);
export const isChatInitializedAtom = selectAtom(chatAtom, (chat) => chat.context.initialized);

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

store.sub(apiUrlAtom, () => {
  const connection = store.get(connectionStateAtom);
  if (connection.type === 'CONNECTED') {
    connection.connection.close();
  }
});
