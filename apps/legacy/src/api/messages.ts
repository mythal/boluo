import type { EditMessage, GetMessagesByChannel, Message, NewMessage } from '@boluo/api';
import { type Id } from '../utils/id';

export type ByChannel = GetMessagesByChannel;
export type { EditMessage, Message, NewMessage };

export interface MoveTo {
  channelId: Id;
  messageId: Id;
  targetId: Id;
  mode: 'TOP' | 'BOTTOM';
}
