import { selectAtom } from 'jotai/utils';
import { ChatItem, posCompare } from '../types/chat-items';
import { ChannelState } from './channel';
import { chatAtom, ChatState } from './chat';

export interface ChatListState {
  channelState: ChannelState;
  list: ChatItem[];
}

const makeChatList = (channelState: ChannelState): ChatItem[] => {
  const previews = Object.values(channelState.previewMap);
  let chatItemList: ChatItem[] = channelState.messages;
  chatItemList = chatItemList.concat(previews);
  // TODO: Optimize this
  chatItemList.sort(posCompare);
  return chatItemList;
};

export type ChatListMap = Record<string, ChatListState>;

export const shouldSkip = (previous: ChannelState, next: ChannelState) => {
  return previous === next;
};

export const chatListAtom = selectAtom<ChatState, ChatListMap>(chatAtom, (chat, previousMap: ChatListMap = {}) => {
  if (chat.type !== 'SPACE') {
    return {};
  }
  if (!chat.context.initialized) {
    return {};
  }
  const { channels } = chat;
  let hasAnyUpdate = false;
  const chatListMap: ChatListMap = {};
  for (const channelId of Object.keys(chat.channels)) {
    const channelState = channels[channelId]!;
    const previousState = previousMap[channelId];
    if (previousState && shouldSkip(previousState.channelState, channelState)) {
      chatListMap[channelId] = previousState;
    } else {
      hasAnyUpdate = true;
      chatListMap[channelId] = { channelState: channelState, list: makeChatList(channelState) };
    }
  }

  if (!hasAnyUpdate) {
    return previousMap;
  }

  return chatListMap;
});
