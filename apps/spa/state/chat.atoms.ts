import { apiUrlAtom } from '@boluo/api-browser';
import { closeWebSocketNormally } from '@boluo/api/websocket/close';
import { backendUrlChangeReasonAtom } from '../base-url';
import { atom } from 'jotai';
import type { useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { store } from '@boluo/store';
import { extractMessageMutationAction, type ChatActionUnion } from './chat.actions';
import { chatReducer, type ChatSpaceState, initialChatState, makeChatState } from './chat.reducer';
import { routeAtom } from './view.atoms';
import { invalidateSidebarChannelMessages } from './sidebarMessages';

const baseChatAtom = atom(initialChatState);

export const chatAtom = atom<ChatSpaceState, [ChatActionUnion], void>(
  (get) => {
    const route = get(routeAtom);
    const chat = get(baseChatAtom);
    if (route.type === 'SPACE') {
      if (route.spaceId === chat.context.spaceId) {
        return chat;
      } else {
        return makeChatState(route.spaceId, chat.context.sessionGeneration + 1);
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
        chat = makeChatState(route.spaceId, chat.context.sessionGeneration + 1);
      }
    }
    const newState = chatReducer(chat, action);
    const messageMutation = extractMessageMutationAction(action);
    if (messageMutation && newState !== chat) {
      void invalidateSidebarChannelMessages(
        newState.context.spaceId,
        newState.context.sessionGeneration,
        messageMutation.payload.channelId,
      );
    }
    set(baseChatAtom, newState);
  },
);
export const isChatInitializedAtom = selectAtom(chatAtom, (chat) => chat.context.initialized);
export const chatSessionGenerationAtom = selectAtom(
  chatAtom,
  (chat) => chat.context.sessionGeneration,
);

export const notifyTimestampAtom = selectAtom(chatAtom, (chat) =>
  chat.context.initialized ? chat.notifyTimestamp : -1,
);

export type ChatDispatch = ReturnType<typeof useSetAtom<typeof chatAtom>>;

export const connectionStateAtom = selectAtom(chatAtom, (chatState) => chatState.connection);
export const chatEffectsAtom = selectAtom(chatAtom, (chatState) => chatState.effects);

store.sub(apiUrlAtom, () => {
  const connection = store.get(connectionStateAtom);
  if (connection.type === 'CONNECTED') {
    closeWebSocketNormally(connection.connection, store.get(backendUrlChangeReasonAtom));
  }
});
