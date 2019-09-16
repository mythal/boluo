export interface Message {
  id: string;
  channelId: string;
  text: string;
  created: Date;
  character: string;
  sender?: Sender;
  senderId?: string;
}

interface Sender {
  nickname: string;
  id: string;
  username: string;
}
