import type { Event } from 'api';
import { useSetAtom } from 'jotai';
import { atomWithReducer, selectAtom } from 'jotai/utils';
import type { Reducer } from 'react';
import { BACKEND_HOST, PING, PONG } from '../const';
import type { Action, AppAction } from './actions';
import { makeAction } from './actions';
import type { ChannelState } from './channel';
import { channelReducer, makeInitialChannelState } from './channel';
import type { ConnectionState } from './connection';
import { connectionReducer, initialConnectionState } from './connection';
import { store } from './store';

export interface ChatReducerContext {
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
  context: ChatReducerContext;
}

export type ChatState = EmptyChatState | SpaceChatState;

export function isInitializedSpaceChat(chat: ChatState): chat is SpaceChatState {
  return chat.type === 'SPACE' && chat.context.initialized;
}

const channelsReducer = (
  channels: SpaceChatState['channels'],
  action: AppAction,
  context: ChatReducerContext,
): SpaceChatState['channels'] => {
  if ('channelId' in action.payload) {
    const { channelId } = action.payload;
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

const handleSpaceUpdated = (
  state: ChatState,
  { payload: spaceWithRelated }: Action<'spaceUpdated'>,
): SpaceChatState => {
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

const reducer: Reducer<ChatState, AppAction> = (state: ChatState, action: AppAction): ChatState => {
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
  if (state.type === 'EMPTY') {
    return state;
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

const eventToAction = (e: Event): AppAction | null => {
  if (e.body.type === 'NEW_MESSAGE') {
    const { channelId, message } = e.body;
    return { type: 'receiveMessage', payload: { channelId, message } };
  } else if (e.body.type === 'INITIALIZED') {
    return { 'type': 'initialized', payload: {} };
  } else if (e.body.type === 'SPACE_UPDATED') {
    return { 'type': 'spaceUpdated', payload: e.body.spaceWithRelated };
  } else if (e.body.type === 'MESSAGE_EDITED') {
    return { type: 'messageEdited', payload: e.body };
  }
  return null;
};

export const chatAtom = atomWithReducer<ChatState, AppAction>({ type: 'EMPTY' }, reducer);

export const channelsAtom = selectAtom(chatAtom, (chatState) => {
  if (!isInitializedSpaceChat(chatState)) {
    return undefined;
  }
  return chatState.channels;
});

export type Dispatch = <A extends AppAction>(type: A['type'], payload: A['payload']) => void;

export const useDispatch = (): Dispatch => {
  const set = useSetAtom(chatAtom);
  return <A extends AppAction>(type: A['type'], payload: A['payload']) => set(makeAction(type, payload));
};

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
  // console.log('state', chatState);
  if (chatState.type !== 'SPACE') return;
  if (chatState.connection.type === 'CLOSED') {
    console.debug('start new connection');
    const mailboxId = chatState.context.spaceId;
    store.set(chatAtom, makeAction('connecting', { mailboxId }));
    const newConnection = createMailboxConnection(mailboxId);
    newConnection.onopen = (_) => {
      store.set(chatAtom, makeAction('connected', { connection: newConnection, mailboxId }));
    };
    newConnection.onclose = (_) => {
      store.set(chatAtom, makeAction('connectionClosed', { mailboxId }));
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
      if (!action) {
        return;
      }
      store.set(chatAtom, action);
    };
  }
});
