import type { Reducer } from 'react';
import type { ChannelState } from './channel.reducer';
import { channelReducer, makeInitialChannelState } from './channel.reducer';
import { ChatAction, ChatActionUnion, eventToChatAction } from './chat.actions';
import type { ConnectionState } from './connection.reducer';
import { connectionReducer, initialConnectionState } from './connection.reducer';

export interface ChatReducerContext {
  spaceId: string;
  initialized: boolean;
}

export interface ChatSpaceState {
  connection: ConnectionState;
  channels: Record<string, ChannelState>;
  context: ChatReducerContext;
  lastEventTimestamp: number;
}

export const initialChatState: ChatSpaceState = {
  connection: {
    type: 'CLOSED',
    retry: 0,
    countdown: 0,
  },
  channels: {},
  context: {
    spaceId: '',
    initialized: false,
  },
  lastEventTimestamp: 0,
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

export const makeChatState = (spaceId: string): ChatSpaceState => ({
  channels: {},
  connection: initialConnectionState,
  context: {
    spaceId,
    initialized: false,
  },
  lastEventTimestamp: 0,
});

const handleChannelDeleted = (
  state: ChatSpaceState,
  { payload: { channelId } }: ChatAction<'channelDeleted'>,
): ChatSpaceState => {
  const { channels } = state;
  const nextChannels = { ...channels };
  delete nextChannels[channelId];
  return { ...state, channels: nextChannels };
};

const handleEventFromServer = (
  state: ChatSpaceState,
  { payload: event }: ChatAction<'eventFromServer'>,
): ChatSpaceState => {
  if (event.timestamp <= state.lastEventTimestamp) {
    return state;
  }
  const chatAction = eventToChatAction(event);
  const lastEventTimestamp = event.timestamp;
  if (chatAction === null) {
    return { ...state, lastEventTimestamp };
  }
  return { ...chatReducer(state, chatAction), lastEventTimestamp };
};
export const chatReducer: Reducer<ChatSpaceState, ChatActionUnion> = (
  state: ChatSpaceState,
  action: ChatActionUnion,
): ChatSpaceState => {
  if (action.type === 'eventFromServer') {
    return handleEventFromServer(state, action);
  }
  console.debug(`action: ${action.type}`, action.payload);
  if (action.type === 'spaceUpdated') {
    return handleSpaceUpdated(state, action);
  } else if (action.type === 'enterSpace') {
    if (state.context.spaceId === action.payload.spaceId) {
      return state;
    }
    return makeChatState(action.payload.spaceId);
  } else if (action.type === 'channelDeleted') {
    return handleChannelDeleted(state, action);
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
