import { store } from 'common/store';
import { atomFamily, selectAtom } from 'jotai/utils';
import { byPos } from '../sort';
import { ChatItem } from '../types/chat-items';
import { ChannelState, makeInitialChannelState } from './channel';
import { ChatSpaceState } from './chat';
import { chatAtom } from './chat.atoms';

export interface ChatListState {
  channelState: ChannelState;
  itemList: ChatItem[];
}

const makeChatList = (channelState: ChannelState): ChatItem[] => {
  const { minPos } = channelState;
  const previews = Object.values(channelState.previewMap);
  const messages = Object.values(channelState.messageMap);
  const chatItemList: ChatItem[] = messages;
  if (minPos === null) {
    chatItemList.push(...previews);
  } else {
    chatItemList.push(...previews.filter(item => item.pos > minPos));
  }
  chatItemList.sort(byPos);
  return chatItemList;
};

export const chatListAtomFamily = atomFamily((channelId: string) =>
  selectAtom<ChatSpaceState, ChatListState | undefined>(
    chatAtom,
    (chat, previousListState) => {
      if (!chat.context.initialized) {
        return undefined;
      }
      let channelState = chat.channels[channelId];
      if (previousListState && channelState === previousListState.channelState) {
        return previousListState;
      }
      channelState ||= makeInitialChannelState(channelId);
      const itemList = makeChatList(channelState);
      return { itemList, channelState };
    },
  )
);

// Avoid memory leak
// https://jotai.org/docs/utilities/family#caveat-memory-leaks
window.setInterval(() => {
  const channels = store.get(chatAtom).channels;
  chatListAtomFamily.setShouldRemove((_, channelId): boolean =>
    !(channelId in channels) || !channels[channelId]?.opened
  );
  chatListAtomFamily.setShouldRemove(null);
}, 10000);
