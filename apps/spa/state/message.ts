import type { Message } from '@boluo/api';
import type { MessageItem } from './channel.types';

export const toMessageItem = (message: Message): MessageItem => ({
  ...message,
  type: 'MESSAGE',
  key: message.id,
});
