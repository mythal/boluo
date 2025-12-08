import { type ChannelLayout } from '@boluo/common/settings';
import { createContext } from 'react';

export const ChannelLayoutContext = createContext<ChannelLayout>('irc-layout');
