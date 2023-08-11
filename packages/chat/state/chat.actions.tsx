import type { EventBody, Message, Preview, ServerEvent, SpaceWithRelated } from 'api';
import type { Empty } from 'utils';
import { MakeAction, makeAction } from './actions';

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

export const makeChatAction = <A extends ChatActionUnion>(type: A['type'], payload: A['payload']) => {
  return makeAction<ChatActionMap, A, undefined>(type, payload, undefined);
};

export const eventToChatAction = (e: ServerEvent): ChatActionUnion | null => {
  switch (e.body.type) {
    case 'NEW_MESSAGE':
      return makeChatAction('receiveMessage', e.body);
    case 'INITIALIZED':
      return makeChatAction('initialized', {});
    case 'SPACE_UPDATED':
      return makeChatAction('spaceUpdated', e.body.spaceWithRelated);
    case 'MESSAGE_EDITED':
      return makeChatAction('messageEdited', e.body);
    case 'MESSAGE_DELETED':
      return makeChatAction('messageDeleted', e.body);
    case 'MESSAGE_PREVIEW':
      return makeChatAction('messagePreview', { ...e.body, timestamp: e.id.timestamp });
    case 'CHANNEL_DELETED':
      return makeChatAction('channelDeleted', e.body);
    case 'CHANNEL_EDITED':
    case 'MEMBERS':
    case 'STATUS_MAP':
    case 'APP_UPDATED':
    default:
      return null;
  }
};
