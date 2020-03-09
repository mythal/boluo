import { Message } from './messages';
import { Id } from '../id';
import { Entity } from '../entities';
import { Channel, Member } from './channels';

export const NEW_MESSAGE = 'newMessage';
export type NEW_MESSAGE = typeof NEW_MESSAGE;

export const MESSAGE_DELETED = 'messageDeleted';
export type MESSAGE_DELETED = typeof MESSAGE_DELETED;

export const MESSAGE_EDITED = 'messageEdited';
export type MESSAGE_EDITED = typeof MESSAGE_EDITED;

export const MESSAGE_PREVIEW = 'messagePreview';
export type MESSAGE_PREVIEW = typeof MESSAGE_PREVIEW;

export const CHANNEL_DELETED = 'channelDeleted';
export type CHANNEL_DELETED = typeof CHANNEL_DELETED;

export const CHANNEL_EDITED = 'channelEdited';
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

export type ChannelEvent = Event<
  NewMessage | MessageDeleted | MessageEdited | MessagePreview | ChannelEdited | ChannelDeleted | PushMembers
>;

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
  type: 'members';
  members: Member[];
}

export interface NewPreviewEvent {
  type: 'preview';
  preview: NewPreview;
}
