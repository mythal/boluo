import { User } from '../user';

export interface Message {
  id: string;
  channelId: string;
  text: string;
  created: number;
  character: string;
  sender?: User;
  senderId?: string;
}
