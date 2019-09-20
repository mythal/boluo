import { User } from '../user';
import { MessageType } from 'boluo-common';

export interface Message {
  id: string;
  channelId: string;
  text: string;
  created: number;
  character: string;
  sender?: User;
  senderId?: string;
  type: keyof typeof MessageType;
}
