import type { Channel, Event } from 'boluo-api';
import type { FC } from 'react';
import { createContext as createReactContext, useCallback, useContext, useReducer } from 'react';
import { createContext as createSelectorContext, useContextUpdate } from 'use-context-selector';
import type { ChildrenProps } from '../helper/props';
import { useChannelList } from '../hooks/useChannelList';
import { SpaceConnectionStateContext } from '../hooks/useChatConnection';
import type { Action, SpaceUpdated } from './actions';
import type { ChannelState } from './channel';
import { channelReducer, makeInitialChannelState } from './channel';
import { useChatEvent } from './connection';

export interface ChatState {
  channels: Record<string, ChannelState>;
}

export const ChatContext = createSelectorContext<ChatState>({ channels: {} });
ChatContext.Provider.displayName = 'ChatContext.Provider';

interface ProviderProps extends ChildrenProps {
  spaceId: string;
}

const channelsReducer = (channels: ChatState['channels'], action: Action): ChatState['channels'] => {
  if ('channelId' in action) {
    const { channelId } = action;
    const channelState = channelReducer(channels[channelId] ?? makeInitialChannelState(channelId), action);
    return { ...channels, [channelId]: channelState };
  } else {
    const nextChannels: ChatState['channels'] = {};
    for (const channelState of Object.values(channels)) {
      nextChannels[channelState.id] = channelReducer(channelState, action);
    }
    return nextChannels;
  }
};

const handleSpaceUpdated = (state: ChatState, { spaceWithRelated }: SpaceUpdated): ChatState => {
  const channels = { ...state.channels };
  for (const channel of spaceWithRelated.channels) {
    if (channel.id in state.channels) {
      continue;
    }
    const newChannelState = makeInitialChannelState(channel.id);
    newChannelState.state = 'INITIALIZED';
    channels[channel.id] = newChannelState;
  }
  return { ...state, channels };
};

const reducer = (state: ChatState, action: Action) => {
  const { channels } = state;
  if (action.type === 'SPACE_UPDATED') {
    return handleSpaceUpdated(state, action);
  }
  return {
    channels: channelsReducer(channels, action),
  };
};

export const ChatDispatchContext = createReactContext<(action: Action) => void>(() => {
  throw new Error('Unexpected,  Attempt use chat dispatch outside the chat.');
});

export const useChatDispatch = (): (action: Action) => void => useContext(ChatDispatchContext);

const eventToAction = (e: Event): Action | null => {
  if (e.body.type === 'NEW_MESSAGE') {
    const { channelId, message } = e.body;
    return { type: 'RECEIVE_MESSAGE', channelId, message };
  } else if (e.body.type === 'INITIALIZED') {
    return { 'type': 'INITIALIZED' };
  } else if (e.body.type === 'SPACE_UPDATED') {
    return { 'type': 'SPACE_UPDATED', spaceWithRelated: e.body.spaceWithRelated };
  }
  return null;
};

const initChatState = (channels: Channel[]): ChatState => {
  return { channels: Object.fromEntries(channels.map(channel => [channel.id, makeInitialChannelState(channel.id)])) };
};

export const ChatStateProvider: FC<ProviderProps> = ({ children, spaceId }) => {
  const channels = useChannelList(spaceId);
  const connectionState = useContext(SpaceConnectionStateContext);
  const [state, reducerDispatch] = useReducer(reducer, channels, initChatState);
  const update = useContextUpdate(ChatContext);
  const dispatch: typeof reducerDispatch = useCallback((action) => {
    update(() => reducerDispatch(action), { suspense: true });
  }, [update]);
  const onEvent = useCallback((e: Event) => {
    const action = eventToAction(e);
    if (action) {
      dispatch(action);
    }
  }, [dispatch]);
  useChatEvent(connectionState, onEvent);
  return (
    <ChatDispatchContext.Provider value={dispatch}>
      <ChatContext.Provider value={state}>{children}</ChatContext.Provider>
    </ChatDispatchContext.Provider>
  );
};
