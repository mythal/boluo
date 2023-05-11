import { atomFamily, selectAtom } from 'jotai/utils';
import { store } from 'store';
import { byPos } from '../sort';
import { ChatItem, MessageItem, PreviewItem } from '../types/chat-items';
import { ChannelState, makeInitialChannelState } from './channel';
import { chatAtom } from './chat.atoms';
import { ChatSpaceState } from './chat.reducer';

export interface ChatListState {
  channelState: ChannelState;
  itemList: ChatItem[];
}

const makeChatList = (channelState: ChannelState): ChatItem[] => {
  const minPos = channelState.minPos ?? Number.MIN_SAFE_INTEGER;
  const previewMap = new Map<string, PreviewItem>(
    Object.values(channelState.previewMap).map((item): [string, PreviewItem] => [item.id, item]),
  );
  const itemList: ChatItem[] = Object.values(channelState.messageMap);
  for (let i = 0; i < itemList.length; i += 1) {
    const message = itemList[i]! as MessageItem;
    const preview = previewMap.get(message.id);
    if (!preview) {
      continue;
    }
    if (preview.editFor === message.modified) {
      itemList[i] = { ...preview, pos: message.pos };
    }
    previewMap.delete(message.id);
  }
  const previews = previewMap.values();
  for (const preview of previews) {
    if (preview.pos > minPos && preview.text !== '') {
      itemList.push(preview);
    }
  }
  itemList.sort(byPos);
  return itemList;
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
