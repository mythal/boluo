import { type MessageSize } from '@boluo/common/settings';
import { createContext } from 'react';

export const MessageSizeContext = createContext<MessageSize>('message-size-normal');
