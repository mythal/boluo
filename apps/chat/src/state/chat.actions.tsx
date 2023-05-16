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
  messagePreview: { channelId: string; preview: Preview };
  messageDeleted: { channelId: string; messageId: string };
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
      return makeChatAction('messagePreview', e.body);
    default:
      return null;
  }
};
