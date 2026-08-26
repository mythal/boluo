import type { ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import * as L from 'list';
import { useEffect } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import type { MessageItem } from '../state/channel.types';
import { toMessageItem } from '../state/message';
import { sidebarChannelMessagesKey } from '../state/sidebarMessages';

const SIDEBAR_PRELOAD_LIMIT = 5;

export interface SidebarChannelMessages {
  historyExhausted: boolean;
  messages: L.List<MessageItem>;
}

const fetchSidebarChannelMessages = async ([, spaceId, , channelId]: ReturnType<
  typeof sidebarChannelMessagesKey
>): Promise<SidebarChannelMessages> => {
  const result = await get('/messages/by_channel', {
    before: null,
    channelId,
    limit: SIDEBAR_PRELOAD_LIMIT,
    spaceId,
  });
  if (result.isErr) throw result.err;
  return {
    historyExhausted: result.some.length < SIDEBAR_PRELOAD_LIMIT,
    messages: L.reverse(L.map(toMessageItem, L.from(result.some))),
  };
};

export const useSidebarChannelMessages = (
  spaceId: string,
  sessionGeneration: number,
  channelId: string,
  enabled: boolean,
): SWRResponse<SidebarChannelMessages, ApiError> => {
  const key = sidebarChannelMessagesKey(spaceId, sessionGeneration, channelId);
  const response = useSWR<SidebarChannelMessages, ApiError, typeof key>(
    key,
    enabled ? fetchSidebarChannelMessages : null,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnMount: false,
      revalidateOnReconnect: false,
      // Sidebar preloading is best-effort and should not create observability noise.
      onError: () => undefined,
      shouldRetryOnError: false,
    },
  );
  const { mutate } = response;

  useEffect(() => {
    if (enabled) void mutate();
  }, [enabled, mutate]);

  return response;
};
