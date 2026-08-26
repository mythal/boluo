import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';
import {
  type ChannelState,
  isChannelHistoryFull,
  makeInitialChannelState,
} from '../state/channel.reducer';
import { chatAtom } from '../state/chat.atoms';
import { type ChatSpaceState } from '../state/chat.reducer';
import { useChannelId } from './useChannelId';

const getChannel = (chatState: ChatSpaceState, channelId: string): ChannelState | undefined => {
  if (!chatState.context.initialized) return undefined;
  return chatState.channels[channelId] ?? makeInitialChannelState(channelId);
};

export const useIsFullLoaded = (): boolean => {
  const channelId = useChannelId();
  const isFullLoadAtom = useMemo(
    () =>
      selectAtom(chatAtom, (chat) => {
        const channel = getChannel(chat, channelId);
        return channel ? isChannelHistoryFull(channel) : false;
      }),
    [channelId],
  );
  return useAtomValue(isFullLoadAtom);
};
