import type { Message } from 'api';
import { MessageItem, PreviewItem } from '../types/chat-items';
import { ChatAction, ChatActionUnion } from './chat.actions';
import type { ChatReducerContext } from './chat.reducer';

export type UserId = string;

export interface ChannelState {
  id: string;
  fullLoaded: boolean;
  minPos: number | null;
  messageMap: Record<string, MessageItem>;
  previewMap: Record<UserId, PreviewItem>;
  opened: boolean;
}

const makeMessageItem = (message: Message): MessageItem => ({ ...message, type: 'MESSAGE', key: message.id });

export const makeInitialChannelState = (id: string): ChannelState => {
  return {
    id,
    minPos: null,
    messageMap: {},
    fullLoaded: false,
    previewMap: {},
    opened: false,
  };
};

const handleNewMessage = (
  state: ChannelState,
  { payload }: ChatAction<'receiveMessage'>,
): ChannelState => {
  const prevMessageMap = state.messageMap;
  const message = makeMessageItem(payload.message);

  if (state.minPos === null) {
    const minPos = message.pos;
    const messageMap = { [message.id]: message };
    return { ...state, minPos, messageMap };
  }

  if (message.pos <= state.minPos && !state.fullLoaded) {
    return state;
  }
  if (message.id in prevMessageMap) {
    console.warn('Received a duplicate new message.');
    return state;
  }
  const messageMap = { ...prevMessageMap, [message.id]: message };
  return { ...state, messageMap };
};

const handleMessagesLoaded = (state: ChannelState, { payload }: ChatAction<'messagesLoaded'>): ChannelState => {
  const { fullLoaded } = payload;
  if (state.fullLoaded) {
    return state;
  }
  if (fullLoaded !== state.fullLoaded) {
    state = { ...state, fullLoaded };
  }
  if (payload.messages.length === 0) {
    console.log('Received empty messages list');
    return state;
  }
  const newMessageEntries: Array<[string, MessageItem]> = [...payload.messages]
    .map(message => [message.id, makeMessageItem(message)]);
  const minPos = payload.messages.at(-1)!.pos;
  if (state.minPos === null) {
    return { ...state, messageMap: Object.fromEntries(newMessageEntries), minPos };
  }
  if (state.minPos <= minPos) {
    console.warn('Received messages that are older than the ones already loaded');
    return state;
  }
  const messageMap = { ...state.messageMap };
  for (const [id, item] of newMessageEntries) {
    messageMap[id] = item;
  }
  return { ...state, messageMap, minPos };
};

const handleMessageEdited = (state: ChannelState, { payload }: ChatAction<'messageEdited'>): ChannelState => {
  const message: MessageItem = makeMessageItem(payload.message);
  if (state.minPos === null) {
    return state;
  }
  if (message.pos < state.minPos && !state.fullLoaded) {
    if (message.id in state.messageMap) {
      // The edited message has been moved out of the range of currently loaded messages.
      const messageMap = { ...state.messageMap };
      delete messageMap[message.id];
      return { ...state, messageMap };
    } else {
      return state;
    }
  }

  const messageMap = { ...state.messageMap };
  messageMap[message.id] = message;
  return { ...state, messageMap };
};

const handleMessagePreview = (
  state: ChannelState,
  { payload: { preview } }: ChatAction<'messagePreview'>,
): ChannelState => {
  let { previewMap } = state;
  const chatItem: PreviewItem = { ...preview, type: 'PREVIEW', key: `preview:${preview.senderId}` };
  previewMap = { ...previewMap, [preview.senderId]: chatItem };
  return { ...state, previewMap };
};

const handleMessageDeleted = (
  state: ChannelState,
  { payload: { messageId } }: ChatAction<'messageDeleted'>,
): ChannelState => {
  if (messageId in state.messageMap) {
    const messageMap = { ...state.messageMap };
    const message = messageMap[messageId]!;
    delete messageMap[messageId];
    let minPos = state.minPos;
    if (minPos && message.pos >= minPos) {
      minPos = Math.min(...Object.values(messageMap).map(message => message.pos));
    }
    return { ...state, messageMap, minPos };
  }
  return state;
};

export const channelReducer = (
  state: ChannelState,
  action: ChatActionUnion,
  { initialized }: ChatReducerContext,
): ChannelState => {
  switch (action.type) {
    case 'messagePreview':
      return handleMessagePreview(state, action);
    case 'receiveMessage':
      return handleNewMessage(state, action);
    case 'messageEdited':
      return handleMessageEdited(state, action);
    case 'messageDeleted':
      return handleMessageDeleted(state, action);
    case 'messagesLoaded':
      // This action is triggered by the user
      // and should be ignored if the chat state
      // has not been initialized.
      return initialized ? handleMessagesLoaded(state, action) : state;
    default:
      return state;
  }
};
