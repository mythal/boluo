import type {
  ConnectionError,
  EditMessage,
  UpdateBody,
  Message,
  NewMessage,
  Preview,
  Update,
  SpaceWithRelated,
} from '@boluo/api';
import { type Empty } from '@boluo/types';
import { type MakeAction } from './actions';
import { type FailTo } from './channel.types';
import { type OptimisticMessage } from './channel.reducer';
import { type ComposeState } from './compose.reducer';

export type ChatActionMap = {
  receiveMessage: UpdateBody & { type: 'NEW_MESSAGE' };
  messageSending: {
    newMessage: NewMessage;
    sendTime: number;
    media: File | null;
    composeState: ComposeState;
  };
  messageEditing: {
    editMessage: EditMessage;
    sendTime: number;
    media: File | null;
    composeState: ComposeState;
  };
  setOptimisticMessage: OptimisticMessage;
  removeOptimisticMessage: { id: string };
  fail: { failTo: FailTo; key: string };
  initialized: Empty;
  enterSpace: { spaceId: string };
  spaceUpdated: SpaceWithRelated;
  messagesLoaded: {
    messages: Message[];
    before: number | null;
    channelId: string;
    fullLoaded: boolean;
  };
  messageEdited: { message: Message; channelId: string; oldPos: number };
  connected: { connection: WebSocket; mailboxId: string };
  connecting: { mailboxId: string };
  reconnectCountdownTick: { immediately?: boolean };
  connectionClosed: { mailboxId: string; random: number };
  connectionError: { mailboxId: string; code: ConnectionError };
  debugCloseConnection: { countdown: number };
  reachBottom: { channelId: string };
  setComposeSource: { channelId: string; source: string };
  messagePreview: { channelId: string; preview: Preview; timestamp: number };
  messageDeleted: { channelId: string; messageId: string; pos: number };
  channelDeleted: { channelId: string };
  resetGc: { pos: number };
  update: Update;
  resetChatState: Empty;
};

export type ChatActionUnion = MakeAction<ChatActionMap, keyof ChatActionMap>;

export type ChatAction<T extends keyof ChatActionMap> = MakeAction<ChatActionMap, T>;

export const updateToChatAction = (e: Update): ChatActionUnion | null => {
  switch (e.body.type) {
    case 'NEW_MESSAGE':
      return { type: 'receiveMessage', payload: e.body };
    case 'INITIALIZED':
      return { type: 'initialized', payload: {} };
    case 'SPACE_UPDATED':
      return { type: 'spaceUpdated', payload: e.body.spaceWithRelated };
    case 'MESSAGE_EDITED':
      return { type: 'messageEdited', payload: e.body };
    case 'MESSAGE_DELETED':
      return { type: 'messageDeleted', payload: e.body };
    case 'MESSAGE_PREVIEW':
      return { type: 'messagePreview', payload: { ...e.body, timestamp: e.id.timestamp } };
    case 'CHANNEL_DELETED':
      return { type: 'channelDeleted', payload: e.body };
    case 'CHANNEL_EDITED':
    case 'MEMBERS':
    case 'STATUS_MAP':
    case 'APP_INFO':
    default:
      return null;
  }
};
