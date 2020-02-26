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

export interface Preview {
  id: string;
  senderId: Id;
  channelId: Id;
  parentMessageId: string | null;
  name: string;
  mediaId: Id | null;
  inGame: boolean;
  isAction: boolean;
  isMaster: boolean;
  text: string;
  whisperToUsers: Id[] | null;
  entities: Entity[];
  start: number;
}

export interface NewPreview {
  id: string;
  channelId: Id;
  name: string;
  mediaId: Id | null;
  inGame: boolean;
  isAction: boolean;
  text: string;
  whisperToUsers: Id[] | null;
  entities: Entity[];
  start: number;
}

export interface NewMessage {
  messageId: Id;
  channelId: Id;
  name: string;
  text: string;
  entities: Entity[];
  inGame: boolean;
  isAction: boolean;
}

export interface EditMessage {
  messageId: Id;
  name?: string;
  text?: string;
  entities?: Entity[];
  inGame?: boolean;
  isAction?: boolean;
}

export interface ByChannel {
  channelId: Id;
  after?: number;
  before?: number;
}
