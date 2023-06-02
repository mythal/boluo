import { createContext, useContext } from 'react';

export const ChannelIdContext = createContext<string | null>(null);

export const useChannelId = (): string => {
  const id = useContext(ChannelIdContext);
  if (!id) {
    throw new Error('[Unexpected] Access channel id outside the channel');
  }
  return id;
};
