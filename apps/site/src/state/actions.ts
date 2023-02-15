import type { Message, SpaceWithRelated } from 'api';

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

export interface Connected {
  type: 'CONNECTED';
  connection: WebSocket;
  mailboxId: string;
}

export interface Connecting {
  type: 'CONNECTING';
  mailboxId: string;
}

export interface ConnectionClosed {
  type: 'CONNECTION_CLOSED';
  mailboxId: string;
}

export interface EnterSpace {
  type: 'ENTER_SPACE';
  spaceId: string;
}

export type Action =
  | ReceiveMessage
  | Initialized
  | MessagesLoaded
  | SpaceUpdated
  | Connected
  | ConnectionClosed
  | Connecting
  | EnterSpace;
