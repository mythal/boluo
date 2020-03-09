import { Entity } from '../entities';
import { Id } from '../id';

export interface Message {
  id: string;
  senderId: Id;
  parentMessageId: Id | null;
  name: string;
  mediaId: Id | null;
  seed: number[];
  deleted?: boolean;
  inGame: boolean;
  isAction: boolean;
  isMaster: boolean;
  pinned: boolean;
  tags: string[];
  folded: boolean;
  text: string;
  whisperToUsers: Id[] | null;
  entities: Entity[];
  created: number;
  modified: number;
  orderDate: number;
  orderOffset: number;
}

export interface NewMessage {
  messageId: Id;
  channelId: Id;
  name: string;
  text: string;
  entities: Entity[];
  inGame: boolean;
  isAction: boolean;
  mediaId: string | null;
  orderDate: number | null;
}

export interface ByChannel {
  channelId: Id;
  before?: number;
  limit?: number;
}
