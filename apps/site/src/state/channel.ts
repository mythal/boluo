import type { Message } from 'api';
import type { Action, MessagesLoaded, ReceiveMessage } from './actions';
import type { ChatReducerContext } from './chat';

export interface ChannelState {
  id: string;
  messages: Message[];
}

export const makeInitialChannelState = (id: string): ChannelState => {
  return { id, messages: [] };
};

const handleNewMessage = (state: ChannelState, action: ReceiveMessage): ChannelState => {
  const messages = state.messages.concat([action.message]);
  return { ...state, messages };
};

const handleMessageLoaded = (state: ChannelState, action: MessagesLoaded): ChannelState => {
  const newMessages = [...action.messages].reverse();
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
  action: Action,
  { initialized }: ChatReducerContext,
): ChannelState => {
  switch (action.type) {
    case 'RECEIVE_MESSAGE':
      return handleNewMessage(state, action);
    case 'MESSAGES_LOADED':
      // This action is triggered by the user
      // and should be ignored if the chat state
      // has not been initialized.
      return initialized ? handleMessageLoaded(state, action) : state;
    default:
      return state;
  }
};
