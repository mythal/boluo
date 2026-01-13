import { apiUrlAtom } from '@boluo/api-browser';
import { atom } from 'jotai';
import type { useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { store } from '@boluo/store';
import { type ChatActionUnion } from './chat.actions';
import { chatReducer, type ChatSpaceState, initialChatState, makeChatState } from './chat.reducer';
import { routeAtom } from './view.atoms';

const baseChatAtom = atom(initialChatState);

export const chatAtom = atom<ChatSpaceState, [ChatActionUnion], void>(
  (get) => {
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

export const notifyTimestampAtom = selectAtom(chatAtom, (chat) =>
  chat.context.initialized ? chat.notifyTimestamp : -1,
);

export type ChatDispatch = ReturnType<typeof useSetAtom<typeof chatAtom>>;

export const connectionStateAtom = selectAtom(chatAtom, (chatState) => chatState.connection);
export const chatEffectsAtom = selectAtom(chatAtom, (chatState) => chatState.effects);

store.sub(apiUrlAtom, () => {
  const connection = store.get(connectionStateAtom);
  if (connection.type === 'CONNECTED') {
    connection.connection.close();
  }
});
