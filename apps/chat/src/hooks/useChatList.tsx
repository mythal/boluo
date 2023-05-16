import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';
import { binarySearchPos, byPos } from '../sort';
import { ChannelState } from '../state/channel.reducer';
import { chatAtom } from '../state/chat.atoms';
import { ChatItem } from '../types/chat-items';

export const useChatList = (channelId: string): ChatItem[] => {
  const messagesAtom = useMemo(
    () =>
      selectAtom(chatAtom, (chat): [ChannelState['messages'] | null, ChannelState['messageMap'] | null] => {
        const channel = chat.channels[channelId];
        if (!channel) return [null, null];
        return [channel.messages, channel.messageMap];
      }, (a, b) => a?.[1] === b?.[1]),
    [channelId],
  );
  const previewMapAtom = useMemo(
    () => selectAtom(chatAtom, (chat) => chat.channels[channelId]?.previewMap),
    [channelId],
  );
  const [messages, messageMap] = useAtomValue(messagesAtom);
  const previewMap = useAtomValue(previewMapAtom);
  if (!messages || !messageMap || !previewMap) return [];
  const previews = Object.values(previewMap);
  const itemList: ChatItem[] = [...messages];
  const minPos = itemList.length > 0 ? itemList[0]!.pos : Number.MIN_SAFE_INTEGER;
  for (const preview of previews) {
    if (preview.text === '') continue;
    if (preview.id in messageMap) {
      const message = messageMap[preview.id]!;
      if (preview.editFor !== message.modified) {
        continue;
      }
      const index = binarySearchPos(itemList, message.pos);
      if (message !== itemList[index]) {
        throw new Error('Failed binary search');
      }
      if (message.pos === preview.pos) {
        itemList[index] = preview;
        continue;
      } else {
        itemList.splice(index, 1);
      }
    } else if (preview.editFor) {
      continue;
    }
    if (preview.pos > minPos) {
      const index = binarySearchPos(itemList, preview.pos);
      itemList.splice(index, 0, preview);
    }
  }
  return itemList;
};
