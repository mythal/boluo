import { MessageType } from 'boluo-common';

export interface Message {
  id: string;
  channelId: string;
  text: string;
  created: number;
  name: string;
  senderId?: string;
  type: keyof typeof MessageType;
}
