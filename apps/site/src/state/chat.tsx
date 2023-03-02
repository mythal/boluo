import type { Reducer } from 'react';
import { ChatAction, ChatActionUnion, makeChatAction } from './actions/chat';
import type { ChannelState } from './channel';
import { channelReducer, makeInitialChannelState } from './channel';
import type { ConnectionState } from './connection';
import { connectionReducer, initialConnectionState } from './connection';

export interface ChatReducerContext {
  spaceId: string;
  initialized: boolean;
}

export interface ChatSpaceState {
  type: 'SPACE';
  connection: ConnectionState;
  channels: Record<string, ChannelState>;
  context: ChatReducerContext;
}

export const initialChatState: ChatSpaceState = {
  type: 'SPACE',
  connection: {
    type: 'CLOSED',
    retry: 0,
  },
  channels: {},
  context: {
    spaceId: '',
    initialized: false,
  },
};

const channelsReducer = (
  channels: ChatSpaceState['channels'],
  action: ChatActionUnion,
  context: ChatReducerContext,
): ChatSpaceState['channels'] => {
  if ('channelId' in action.payload) {
    const { channelId } = action.payload;
    const channelState = channelReducer(channels[channelId] ?? makeInitialChannelState(channelId), action, context);
    return { ...channels, [channelId]: channelState };
  } else {
    const nextChannels: ChatSpaceState['channels'] = {};
    for (const channelState of Object.values(channels)) {
      nextChannels[channelState.id] = channelReducer(channelState, action, context);
    }
    return nextChannels;
  }
};

const handleSpaceUpdated = (
  state: ChatSpaceState,
  { payload: spaceWithRelated }: ChatAction<'spaceUpdated'>,
): ChatSpaceState => {
  const spaceId = spaceWithRelated.space.id;
  if (state.context.spaceId !== spaceId) {
    state = { ...initialChatState, context: { initialized: false, spaceId } };
  }
  const channels = { ...state.channels };
  for (const channel of spaceWithRelated.channels) {
    if (channel.id in state.channels) {
      continue;
    }
    const newChannelState = makeInitialChannelState(channel.id);
    channels[channel.id] = newChannelState;
  }
  return { ...state, channels };
};

const makeChatState = (spaceId: string): ChatSpaceState => ({
  type: 'SPACE',
  channels: {},
  connection: initialConnectionState,
  context: {
    spaceId,
    initialized: false,
  },
});

export const chatReducer: Reducer<ChatSpaceState, ChatActionUnion> = (
  state: ChatSpaceState,
  action: ChatActionUnion,
): ChatSpaceState => {
  console.debug(`action: ${action.type}`, action.payload);
  if (action.type === 'enterSpace') {
    if (state.type === 'SPACE' && state.context.spaceId === action.payload.spaceId) {
      return state;
    }
    return makeChatState(action.payload.spaceId);
  }
  if (action.type === 'spaceUpdated') {
    return handleSpaceUpdated(state, action);
  }
  const { context } = state;
  if (action.type === 'initialized') {
    return { ...state, context: { ...context, initialized: true } };
  }

  const { channels, connection, ...rest } = state;

  return {
    connection: connectionReducer(connection, action, context),
    channels: channelsReducer(channels, action, context),
    ...rest,
  };
};
