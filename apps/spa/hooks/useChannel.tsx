import { Channel } from '@boluo/api';
import React from 'react';

export const ChannelContext = React.createContext<Channel | null>(null);

export const useChannel = () => {
  const channel = React.useContext(ChannelContext);
  if (!channel) {
    console.error('useChannel must be used within a channel context');
  }
  return channel;
};
