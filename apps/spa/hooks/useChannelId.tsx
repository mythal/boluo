import { createContext, use } from 'react';

export const ChannelIdContext = createContext<string | null>(null);

export const useChannelId = (): string => {
  const id = use(ChannelIdContext);
  if (!id) {
    throw new Error('[Unexpected] Access channel id outside the channel');
  }
  return id;
};
