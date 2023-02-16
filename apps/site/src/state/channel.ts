import type { Message } from 'api';
import type { Action, AppAction } from './actions';
import type { ChatReducerContext } from './chat';

export interface ChannelState {
  id: string;
  fullLoaded: boolean;
  messages: Message[];
}

export const makeInitialChannelState = (id: string): ChannelState => {
  return { id, messages: [], fullLoaded: false };
};

const handleNewMessage = (state: ChannelState, { payload }: Action<'receiveMessage'>): ChannelState => {
  const messages = state.messages.concat([payload.message]);
  return { ...state, messages };
};

const handleMessageLoaded = (state: ChannelState, { payload }: Action<'messagesLoaded'>): ChannelState => {
  const { fullLoaded } = payload;
  const newMessages = [...payload.messages].reverse();
  if (fullLoaded !== state.fullLoaded) {
    state = { ...state, fullLoaded };
  }
  if (newMessages.length === 0) {
    return state;
  }
  if (state.messages.length === 0) {
    return { ...state, messages: newMessages };
  }
  const firstMessage = state.messages[0]!;
  if (firstMessage.pos <= newMessages[0]!.pos) {
    return state;
  }
  const messages = newMessages.concat(state.messages);
  return { ...state, messages };
};

export const channelReducer = (
  state: ChannelState,
  action: AppAction,
  { initialized }: ChatReducerContext,
): ChannelState => {
  switch (action.type) {
    case 'receiveMessage':
      return handleNewMessage(state, action);
    case 'messagesLoaded':
      // This action is triggered by the user
      // and should be ignored if the chat state
      // has not been initialized.
      return initialized ? handleMessageLoaded(state, action) : state;
    default:
      return state;
  }
};
