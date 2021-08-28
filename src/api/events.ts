import { Message, MessageOrder } from './messages';
import { Entity } from '../interpreter/entities';
import { Channel, Member } from './channels';
import { Id } from '../utils/id';
import { SpaceWithRelated, StatusKind, UserStatus } from './spaces';

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

export type MailboxType = 'CHANNEL' | 'SPACE';

export interface EventQuery {
  mailbox: Id;
  after: number;
}

interface Event<B> {
  mailbox: Id;
  timestamp: number;
  mailboxType: MailboxType;
  body: B;
}

export type Events =
  | Event<NewMessage>
  | Event<MessageDeleted>
  | Event<MessageEdited>
  | Event<MessagePreview>
  | Event<ChannelEdited>
  | Event<ChannelDeleted>
  | Event<PushMembers>
  | Event<Initialized>
  | Event<MessagesMoved>
  | Event<StatusMap>
  | Event<SpaceUpdated>;

export interface SpaceUpdated {
  type: 'SPACE_UPDATED';
  spaceWithRelated: SpaceWithRelated;
}

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
  channelId: Id;
}

export interface MessageEdited {
  type: MESSAGE_EDITED;
  channelId: Id;
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
  clear: boolean;
  text: string | null;
  whisperToUsers: Id[] | null;
  entities: Entity[];
  pos: number;
  editFor: number | null;
}

export interface PreviewPost {
  id: string;
  name: string;
  mediaId: Id | null;
  channelId: Id;
  inGame: boolean;
  isAction: boolean;
  text: string | null;
  entities: Entity[];
  clear: boolean;
  editFor?: number | null;
}

export interface MessagePreview {
  type: MESSAGE_PREVIEW;
  preview: Preview;
  channelId: Id;
}

export interface MessagesMoved {
  type: MESSAGES_MOVED;
  channelId: Id;
  movedMessages: Message[];
  orderChanges: MessageOrder[];
}

export interface ChannelEdited {
  type: CHANNEL_EDITED;
  channelId: Id;
  channel: Channel;
}

export interface ChannelDeleted {
  type: CHANNEL_DELETED;
  channelId: Id;
}

export interface PushMembers {
  type: 'MEMBERS';
  channelId: Id;
  members: Member[];
}

export interface StatusMap {
  type: 'STATUS_MAP';
  statusMap: Record<Id, UserStatus>;
  spaceId: Id;
}

export interface SendPreview {
  type: 'PREVIEW';
  preview: PreviewPost;
}

export interface SendStatus {
  type: 'STATUS';
  kind: StatusKind;
  focus: Id[];
}

export type ClientEvent = SendPreview | SendStatus;

export const isEmptyPreview = (preview: Preview): boolean =>
  preview.text === '' || (preview.text !== null && preview.entities.length === 0);
