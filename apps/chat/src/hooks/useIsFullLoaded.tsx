import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';
import { ChannelState, makeInitialChannelState } from '../state/channel';
import { chatAtom } from '../state/chat.atoms';
import { ChatSpaceState } from '../state/chat.reducer';
import { useChannelId } from './useChannelId';

const getChannel = (chatState: ChatSpaceState, channelId: string): ChannelState | undefined => {
  if (!chatState.context.initialized) return undefined;
  return chatState.channels[channelId] ?? makeInitialChannelState(channelId);
};

export const useIsFullLoaded = (): boolean => {
  const channelId = useChannelId();
  const isFullLoadAtom = useMemo(
    () => selectAtom(chatAtom, chat => getChannel(chat, channelId)?.fullLoaded),
    [channelId],
  );
  return useAtomValue(isFullLoadAtom) || false;
};
