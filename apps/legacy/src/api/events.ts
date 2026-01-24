import { type PreviewDiffOp, type UpdateLifetime } from '@boluo/types/bindings';
import { type Entity } from '../interpreter/entities';
import { type Id } from '../utils/id';
import { type Channel, type MemberWithUser } from './channels';
import { type Message } from './messages';
import { type SpaceWithRelated, type StatusKind, type UserStatus } from './spaces';

export const NEW_MESSAGE = 'NEW_MESSAGE';
export type NEW_MESSAGE = typeof NEW_MESSAGE;

export const MESSAGE_DELETED = 'MESSAGE_DELETED';
export type MESSAGE_DELETED = typeof MESSAGE_DELETED;

export const MESSAGE_EDITED = 'MESSAGE_EDITED';
export type MESSAGE_EDITED = typeof MESSAGE_EDITED;

export const MESSAGE_PREVIEW = 'MESSAGE_PREVIEW';
export type MESSAGE_PREVIEW = typeof MESSAGE_PREVIEW;

export const DIFF = 'DIFF';
export type DIFF = typeof DIFF;

export const CHANNEL_DELETED = 'CHANNEL_DELETED';
export type CHANNEL_DELETED = typeof CHANNEL_DELETED;

export const CHANNEL_EDITED = 'CHANNEL_EDITED';
export type CHANNEL_EDITED = typeof CHANNEL_EDITED;

export type INITIALIZED = typeof INITIALIZED;
export const INITIALIZED = 'INITIALIZED';

export const APP_UPDATED = 'APP_UPDATED';
export type APP_UPDATED = typeof APP_UPDATED;

export type MailboxType = 'CHANNEL' | 'SPACE';

export interface EventQuery {
  mailbox: Id;
  after: number;
}

export interface EventId {
  timestamp: number;
  node: number;
  seq: number;
}

interface Event<B> {
  mailbox: Id;
  id: EventId;
  mailboxType: MailboxType;
  body: B;
  live?: UpdateLifetime;
}

export type Events =
  | Event<NewMessage>
  | Event<MessageDeleted>
  | Event<MessageEdited>
  | Event<MessagePreview>
  | Event<PreviewDiffUpdate>
  | Event<ChannelEdited>
  | Event<ChannelDeleted>
  | Event<PushMembers>
  | Event<Initialized>
  | Event<StatusMap>
  | Event<SpaceUpdated>
  | Event<ConnectionError>
  | Event<AppUpdated>;

export interface ConnectionError {
  type: 'ERROR';
  code?: string;
  cause: string;
}

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
  previewId: string | null;
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

export interface EditPreview {
  time: string;
  p: number;
  q: number;
}

export interface Preview {
  id: string;
  senderId: Id;
  channelId: Id;
  v?: number;
  parentMessageId?: string | null;
  name: string;
  mediaId?: Id | null;
  inGame?: boolean;
  isAction?: boolean;
  isMaster?: boolean;
  clear?: boolean;
  text?: string | null;
  whisperToUsers?: Id[] | null;
  entities: Entity[];
  pos: number;
  edit?: EditPreview | null;
}

export interface PreviewDiffPost {
  ch: Id;
  id: Id;
  ref: number;
  v?: number;
  op: PreviewDiffOp[];
  xs?: Entity[];
}

export interface PreviewDiff {
  sender: Id;
  _: PreviewDiffPost;
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
  edit: EditPreview | null;
}

export interface MessagePreview {
  type: MESSAGE_PREVIEW;
  preview: Preview;
  channelId: Id;
}

export interface PreviewDiffUpdate {
  type: DIFF;
  channelId: Id;
  diff: PreviewDiff;
}

export interface AppUpdated {
  type: APP_UPDATED;
  version: string;
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
  members: MemberWithUser[];
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
  preview.text === '' ||
  (preview.text != null && (preview.entities == null || preview.entities.length === 0));

export const shouldAdvanceCursor = (event: Events): boolean =>
  event.live == null || event.live === 'P';

export const compareEvents = (a: EventId, b: EventId): number => {
  if (a.timestamp !== b.timestamp) {
    return a.timestamp - b.timestamp;
  } else if (a.node !== b.node) {
    return a.node - b.node;
  } else {
    return a.seq - b.seq;
  }
};

export const eventIdMax = (a: EventId, b: EventId): EventId => {
  if (compareEvents(a, b) < 0) {
    return b;
  } else {
    return a;
  }
};

export const eventIdMin = (a: EventId, b: EventId): EventId => {
  if (compareEvents(a, b) < 0) {
    return a;
  } else {
    return b;
  }
};
