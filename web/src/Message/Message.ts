import { User } from '../user';

export interface Message {
  id: string;
  channelId: string;
  text: string;
  created: Date;
  character: string;
  sender?: User;
  senderId?: string;
}
