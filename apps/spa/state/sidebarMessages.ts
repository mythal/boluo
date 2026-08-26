import { mutate } from 'swr';

export const sidebarChannelMessagesKey = (
  spaceId: string,
  sessionGeneration: number,
  channelId: string,
) => ['sidebar-channel-messages', spaceId, sessionGeneration, channelId] as const;

export const invalidateSidebarChannelMessages = (
  spaceId: string,
  sessionGeneration: number,
  channelId: string,
) =>
  mutate(sidebarChannelMessagesKey(spaceId, sessionGeneration, channelId), undefined, {
    revalidate: true,
  });
