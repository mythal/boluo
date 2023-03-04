import { atomFamily, selectAtom } from 'jotai/utils';
import { ChatItem, posCompare } from '../../types/chat-items';
import { ChannelState, makeInitialChannelState } from '../channel';
import { ChatSpaceState } from '../chat';
import { store } from '../store';
import { chatAtom } from './chat';

export interface ChatListState {
  channelState: ChannelState;
  itemList: ChatItem[];
}

const makeChatList = (channelState: ChannelState): ChatItem[] => {
  const previews = Object.values(channelState.previewMap);
  let chatItemList: ChatItem[] = channelState.messages;
  chatItemList = chatItemList.concat(previews);
  // TODO: Optimize this
  chatItemList.sort(posCompare);
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
    !(channelId in channels) || channels[channelId]?.opened !== true
  );
  chatListAtomFamily.setShouldRemove(null);
}, 10000);
