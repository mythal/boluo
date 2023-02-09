import type { Message, SpaceWithRelated } from 'boluo-api';

export interface ReceiveMessage {
  type: 'RECEIVE_MESSAGE';
  channelId: string;
  message: Message;
}

export interface Initialized {
  type: 'INITIALIZED';
}

export interface SpaceUpdated {
  type: 'SPACE_UPDATED';
  spaceWithRelated: SpaceWithRelated;
}

export interface MessagesLoaded {
  type: 'MESSAGES_LOADED';
  messages: Message[];
  before: number | null;
  channelId: string;
}

export type Action = ReceiveMessage | Initialized | MessagesLoaded | SpaceUpdated;
