import type { EventBody, Message, Preview, ServerEvent, SpaceWithRelated } from '@boluo/api';
import type { Empty } from '@boluo/utils';
import { type MakeAction } from './actions';

export type ChatActionMap = {
  receiveMessage: EventBody & { type: 'NEW_MESSAGE' };
  initialized: Empty;
  enterSpace: { spaceId: string };
  spaceUpdated: SpaceWithRelated;
  messagesLoaded: { messages: Message[]; before: number | null; channelId: string; fullLoaded: boolean };
  messageEdited: { message: Message; channelId: string };
  connected: { connection: WebSocket; mailboxId: string };
  connecting: { mailboxId: string };
  reconnectCountdownTick: { immediately?: boolean };
  connectionClosed: { mailboxId: string; random: number };
  debugCloseConnection: { countdown: number };
  reachBottom: { channelId: string };
  setComposeSource: { channelId: string; source: string };
  messagePreview: { channelId: string; preview: Preview; timestamp: number };
  messageDeleted: { channelId: string; messageId: string };
  channelDeleted: { channelId: string };
  resetGc: { pos: number };
  eventFromServer: ServerEvent;
};

export type ChatActionUnion = MakeAction<ChatActionMap, keyof ChatActionMap>;

export type ChatAction<T extends keyof ChatActionMap> = MakeAction<ChatActionMap, T>;

export const eventToChatAction = (e: ServerEvent): ChatActionUnion | null => {
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
    case 'APP_UPDATED':
    default:
      return null;
  }
};
