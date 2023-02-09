import type { Message } from 'boluo-api';
import type { Action, MessagesLoaded, ReceiveMessage } from './actions';

export interface ChannelState {
  id: string;
  state: 'UNINITIALIZED' | 'INITIALIZED';
  messages: Message[];
}

export const makeInitialChannelState = (id: string): ChannelState => {
  return { id, state: 'UNINITIALIZED', messages: [] };
};

const handleNewMessage = (state: ChannelState, action: ReceiveMessage): ChannelState => {
  const messages = state.messages.concat([action.message]);
  return { ...state, messages };
};

const handleMessageLoaded = (state: ChannelState, action: MessagesLoaded): ChannelState => {
  if (state.state === 'UNINITIALIZED') {
    return state;
  }
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

export const channelReducer = (state: ChannelState, action: Action): ChannelState => {
  switch (action.type) {
    case 'RECEIVE_MESSAGE':
      return handleNewMessage(state, action);
    case 'INITIALIZED':
      return { ...state, state: 'INITIALIZED' };
    case 'MESSAGES_LOADED':
      return handleMessageLoaded(state, action);
    default:
      return state;
  }
};
