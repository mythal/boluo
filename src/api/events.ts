import { Message, MessageOrder } from './messages';
import { Entity } from '../interpreter/entities';
import { Channel, Member } from './channels';
import { Id } from '../utils/id';

export const NEW_MESSAGE = 'NEW_MESSAGE';
export type NEW_MESSAGE = typeof NEW_MESSAGE;

export const MESSAGE_DELETED = 'MESSAGE_DELETED';
export type MESSAGE_DELETED = typeof MESSAGE_DELETED;

export const MESSAGE_EDITED = 'MESSAGE_EDITED';
export type MESSAGE_EDITED = typeof MESSAGE_EDITED;

export const MESSAGE_PREVIEW = 'MESSAGE_PREVIEW';
export type MESSAGE_PREVIEW = typeof MESSAGE_PREVIEW;

export const MESSAGES_MOVED = 'MESSAGES_MOVED';
export type MESSAGES_MOVED = typeof MESSAGES_MOVED;

export const CHANNEL_DELETED = 'CHANNEL_DELETED';
export type CHANNEL_DELETED = typeof CHANNEL_DELETED;

export const CHANNEL_EDITED = 'CHANNEL_EDITED';
export type CHANNEL_EDITED = typeof CHANNEL_EDITED;

export type INITIALIZED = typeof INITIALIZED;
export const INITIALIZED = 'INITIALIZED';

export type MailboxType = 'CHANNEL';

export interface EventQuery {
  mailbox: Id;
  after: number;
}

export interface Event<B> {
  mailbox: Id;
  timestamp: number;
  mailboxType: MailboxType;
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
  | Event<Initialized>
  | Event<HeartbeatMap>
  | Event<MessagesMoved>;

export interface Initialized {
  type: INITIALIZED;
}

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
  mailbox: Id;
  mailboxType: MailboxType;
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
  editFor: number | null;
}

export interface PreviewPost {
  id: string;
  name: string;
  mediaId: Id | null;
  inGame: boolean;
  isAction: boolean;
  text: string | null;
  entities: Entity[];
  editFor?: number | null;
}

export interface MessagePreview {
  type: MESSAGE_PREVIEW;
  preview: Preview;
}

export interface MessagesMoved {
  type: MESSAGES_MOVED;
  movedMessages: Message[];
  orderChanges: MessageOrder[];
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

export interface HeartbeatMap {
  type: 'HEARTBEAT_MAP';
  heartbeatMap: Record<Id, number>;
}

export interface SendPreview {
  type: 'PREVIEW';
  preview: PreviewPost;
}

export interface SendHeartbeat {
  type: 'HEARTBEAT';
}

export type ClientEvent = SendPreview | SendHeartbeat;
