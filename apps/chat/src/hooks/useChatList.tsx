import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { chatListAtomFamily } from '../state/chat-list.atoms';
import { ChatItem } from '../types/chat-items';

export const useChatList = (channelId: string): ChatItem[] | undefined => {
  return useAtomValue(useMemo(() => chatListAtomFamily(channelId), [channelId]))?.itemList;
};
