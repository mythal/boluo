import type { Event } from 'api';
import { atomWithReducer } from 'jotai/utils';
import type { Reducer } from 'react';
import { BACKEND_HOST, PING, PONG } from '../const';
import type { Action, SpaceUpdated } from './actions';
import type { ChannelState } from './channel';
import { channelReducer, makeInitialChannelState } from './channel';
import type { ConnectionState } from './connection';
import { connectionReducer, initialConnectionState } from './connection';
import { store } from './store';

interface ReducerContext {
  spaceId: string;
  initialized: boolean;
}

interface EmptyChatState {
  type: 'EMPTY';
}

interface SpaceChatState {
  type: 'SPACE';
  connection: ConnectionState;
  channels: Record<string, ChannelState>;
  context: {
    spaceId: string;
    initialized: boolean;
  };
}

export type ChatReducerContext = SpaceChatState['context'];

export type ChatState = EmptyChatState | SpaceChatState;

const channelsReducer = (
  channels: SpaceChatState['channels'],
  action: Action,
  context: ChatReducerContext,
): SpaceChatState['channels'] => {
  if ('channelId' in action) {
    const { channelId } = action;
    const channelState = channelReducer(channels[channelId] ?? makeInitialChannelState(channelId), action, context);
    return { ...channels, [channelId]: channelState };
  } else {
    const nextChannels: SpaceChatState['channels'] = {};
    for (const channelState of Object.values(channels)) {
      nextChannels[channelState.id] = channelReducer(channelState, action, context);
    }
    return nextChannels;
  }
};

const handleSpaceUpdated = (state: ChatState, { spaceWithRelated }: SpaceUpdated): SpaceChatState => {
  if (state.type === 'EMPTY') {
    state = {
      type: 'SPACE',
      channels: {},
      connection: initialConnectionState,
      context: {
        initialized: false,
        spaceId: spaceWithRelated.space.id,
      },
    };
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

const makeChatState = (spaceId: string): ChatState => ({
  type: 'SPACE',
  channels: {},
  connection: initialConnectionState,
  context: {
    spaceId,
    initialized: false,
  },
});

const reducer: Reducer<ChatState, Action> = (state: ChatState, action: Action) => {
  console.debug(`action: ${action.type}`, action);
  if (action.type === 'ENTER_SPACE') {
    if (state.type === 'SPACE' && state.context.spaceId === action.spaceId) {
      return state;
    }
    return makeChatState(action.spaceId);
  }
  if (action.type === 'SPACE_UPDATED') {
    return handleSpaceUpdated(state, action);
  }
  if (state.type === 'EMPTY') {
    return state;
  }
  const { context } = state;
  if (action.type === 'INITIALIZED') {
    return { ...state, initialized: true };
  }

  const { channels, connection, ...rest } = state;

  return {
    connection: connectionReducer(connection, action, context),
    channels: channelsReducer(channels, action, context),
    ...rest,
  };
};

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

export const chatAtom = atomWithReducer<ChatState, Action>({ type: 'EMPTY' }, reducer);

const createMailboxConnection = (id: string): WebSocket => {
  const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:';

  return new WebSocket(`${protocol}//${BACKEND_HOST}/events/connect?mailbox=${id}`);
};

function isEvent(object: unknown): object is Event {
  if (typeof object !== 'object' || object === null) {
    return false;
  }
  return 'mailbox' in object && 'body' in object;
}

store.sub(chatAtom, () => {
  const chatState = store.get(chatAtom);
  if (chatState.type !== 'SPACE') return;
  if (chatState.connection.type === 'CLOSED') {
    console.debug('start new connection');
    const mailboxId = chatState.context.spaceId;
    store.set(chatAtom, { type: 'CONNECTING', mailboxId });
    const newConnection = createMailboxConnection(mailboxId);
    newConnection.onopen = (_) => {
      store.set(chatAtom, { type: 'CONNECTED', connection: newConnection, mailboxId });
    };
    newConnection.onclose = (_) => {
      store.set(chatAtom, { type: 'CONNECTION_CLOSED', mailboxId });
    };
    newConnection.onmessage = (message: MessageEvent<unknown>) => {
      const raw = message.data;
      if (raw === PING) {
        newConnection.send(PONG);
        return;
      }
      if (!raw || typeof raw !== 'string' || raw === PONG) {
        return;
      }

      let event: unknown = null;
      try {
        event = JSON.parse(raw);
      } catch {
        return;
      }
      if (!isEvent(event)) {
        return;
      }
      const action = eventToAction(event);
      if (action) {
        store.set(chatAtom, action);
      }
    };
  }
});
