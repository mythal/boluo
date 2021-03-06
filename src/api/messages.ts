import { Entity } from '../interpreter/entities';
import { Id } from '../utils/id';

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

export interface MessageOrder {
  id: string;
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
  whisperToUsers?: Id[];
}

export interface EditMessage {
  messageId: Id;
  name?: string;
  text?: string;
  entities?: Entity[];
  inGame?: boolean;
  isAction?: boolean;
  mediaId?: Id | null;
}

export interface ByChannel {
  channelId: Id;
  before?: number;
  limit?: number;
}

export interface SwapMessage {
  a: Id;
  b: Id;
}

export interface MoveTo {
  messageId: Id;
  orderDate: number;
  orderOffset: number;
  mode: 'TOP' | 'BOTTOM';
}
