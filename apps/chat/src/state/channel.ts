import { MessageItem, posCompare, PreviewItem } from '../types/chat-items';
import { ChatAction, ChatActionUnion } from './actions/chat';
import type { ChatReducerContext } from './chat';

export interface ChannelState {
  id: string;
  fullLoaded: boolean;
  messages: MessageItem[];
  previewMap: Record<string, PreviewItem>; // Key: User ID
  opened: boolean;
}

export const makeInitialChannelState = (id: string): ChannelState => {
  return { id, messages: [], fullLoaded: false, previewMap: {}, opened: false };
};

const handleNewMessage = (
  state: ChannelState,
  { payload: { message } }: ChatAction<'receiveMessage'>,
): ChannelState => {
  const messages = state.messages.concat([{ ...message, type: 'MESSAGE', key: message.id }]);
  messages.sort(posCompare);
  return { ...state, messages };
};

const handleMessagesLoaded = (state: ChannelState, { payload }: ChatAction<'messagesLoaded'>): ChannelState => {
  const { fullLoaded } = payload;
  const newMessages: MessageItem[] = [...payload.messages]
    .reverse()
    .map(message => ({ ...message, type: 'MESSAGE', key: message.id }));
  if (fullLoaded !== state.fullLoaded) {
    state = { ...state, fullLoaded };
  }
  if (newMessages.length === 0) {
    console.log('Received empty messages list');
    return state;
  }
  if (state.messages.length === 0) {
    return { ...state, messages: newMessages };
  }
  const firstMessage = state.messages[0]!;
  if (firstMessage.pos <= newMessages[0]!.pos) {
    console.warn('Received messages that are older than the ones already loaded');
    return state;
  }
  const messages = newMessages.concat(state.messages);
  return { ...state, messages };
};

const handleMessageEdited = (state: ChannelState, { payload }: ChatAction<'messageEdited'>): ChannelState => {
  const message: MessageItem = { ...payload.message, type: 'MESSAGE', key: payload.message.id };
  // TODO: Optimize this
  const messages = state.messages.map((x) => (x.id === message.id ? message : x));
  messages.sort(posCompare);
  return { ...state, messages };
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
    case 'messagesLoaded':
      // This action is triggered by the user
      // and should be ignored if the chat state
      // has not been initialized.
      return initialized ? handleMessagesLoaded(state, action) : state;
    default:
      return state;
  }
};
