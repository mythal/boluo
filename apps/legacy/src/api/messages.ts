import { type Entity } from '../interpreter/entities';
import { LegacyEntity } from '../interpreter/legacy-entities';
import { type Id } from '../utils/id';

export interface Message {
  id: string;
  senderId: Id;
  channelId: Id;
  parentMessageId?: Id | null;
  name: string;
  mediaId?: Id | null;
  seed: number[];
  inGame?: boolean;
  isAction?: boolean;
  isMaster?: boolean;
  pinned?: boolean;
  tags?: string[];
  folded?: boolean;
  text: string;
  whisperToUsers?: Id[] | null;
  entities: Array<Entity>;
  created: string;
  modified: string;
  pos: number;
  posP: number;
  posQ: number;
}

export interface NewMessage {
  previewId: Id | null;
  channelId: Id;
  name: string;
  text: string;
  entities: Entity[];
  inGame: boolean;
  isAction: boolean;
  mediaId: string | null;
  whisperToUsers?: Id[];
}

export interface EditMessage {
  messageId: Id;
  name: string;
  text: string;
  entities: Entity[];
  inGame: boolean;
  isAction: boolean;
  mediaId: Id | null;
}

export interface ByChannel {
  channelId: Id;
  before?: number;
  limit?: number;
}

export interface MoveTo {
  channelId: Id;
  messageId: Id;
  targetId: Id;
  mode: 'TOP' | 'BOTTOM';
}

export interface MoveBetween {
  channelId: Id;
  messageId: Id;
  range: [[number, number] | null, [number, number] | null];
}
