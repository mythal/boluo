import { Message } from './messages';
import { Id } from '../id';
import { Entity } from '../entities';
import { Channel, Member } from './channels';

export const NEW_MESSAGE = 'NEW_MESSAGE';
export type NEW_MESSAGE = typeof NEW_MESSAGE;

export const MESSAGE_DELETED = 'MESSAGE_DELETED';
export type MESSAGE_DELETED = typeof MESSAGE_DELETED;

export const MESSAGE_EDITED = 'MESSAGE_EDITED';
export type MESSAGE_EDITED = typeof MESSAGE_EDITED;

export const MESSAGE_PREVIEW = 'MESSAGE_PREVIEW';
export type MESSAGE_PREVIEW = typeof MESSAGE_PREVIEW;

export const CHANNEL_DELETED = 'CHANNEL_DELETED';
export type CHANNEL_DELETED = typeof CHANNEL_DELETED;

export const CHANNEL_EDITED = 'CHANNEL_EDITED';
export type CHANNEL_EDITED = typeof CHANNEL_EDITED;

export interface EventQuery {
  mailbox: Id;
  after: number;
}

export interface Event<B> {
  mailbox: Id;
  timestamp: number;
  body: B;
}

export type ChannelEvent =
  | Event<NewMessage>
  | Event<MessageDeleted>
  | Event<MessageEdited>
  | Event<MessagePreview>
  | Event<ChannelEdited>
  | Event<ChannelDeleted>
  | Event<PushMembers>
  | Event<Heartbeat>;

export interface NewMessage {
  type: NEW_MESSAGE;
  message: Message;
}

export interface MessageDeleted {
  type: MESSAGE_DELETED;
  messageId: Id;
}

export interface MessageEdited {
  type: MESSAGE_EDITED;
  message: Message;
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
  text: string | null;
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
  text: string | null;
  entities: Entity[];
  start: number;
}

export interface MessagePreview {
  type: MESSAGE_PREVIEW;
  preview: Preview;
}

export interface ChannelEdited {
  type: CHANNEL_EDITED;
  channel: Channel;
}

export interface ChannelDeleted {
  type: CHANNEL_DELETED;
}

export interface PushMembers {
  type: 'MEMBERS';
  members: Member[];
}

export interface Heartbeat {
  type: 'HEARTBEAT';
  user_id: Id;
}

export interface SendPreview {
  type: 'PREVIEW';
  preview: NewPreview;
}

export interface SendHeartbeat {
  type: 'HEARTBEAT';
  mailbox: Id;
}

export type ClientEvent = SendPreview | SendHeartbeat;
