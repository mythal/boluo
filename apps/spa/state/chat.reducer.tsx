import type { EventId } from '@boluo/api';
import type { Reducer } from 'react';
import { eventIdCompare } from '@boluo/sort';
import type { ChannelState } from './channel.reducer';
import { channelReducer, makeInitialChannelState } from './channel.reducer';
import { type ChatAction, type ChatActionUnion, toChatAction } from './chat.actions';
import type { ConnectionState } from './connection.reducer';
import { connectionReducer, initialConnectionState } from './connection.reducer';
import type { ChatEffect } from './chat.types';
import { createEffectId, mergeEffects } from './chat.effects';

export interface ChatReducerContext {
  spaceId: string;
  initialized: boolean;
}

export interface ChatSpaceState {
  connection: ConnectionState;
  channels: Record<string, ChannelState>;
  context: ChatReducerContext;
  cursor: EventId;
  /**
   * A timestamp is used to trigger the responsive system to check
   * if an event has occurred that is worth notifying the user about.
   */
  notifyTimestamp: number;
  effects: ChatEffect[];
}

export const zeroEventId: EventId = { timestamp: 0, seq: 0, node: 0 };

export const initialChatState: ChatSpaceState = {
  connection: {
    type: 'CLOSED',
    retry: 0,
    countdown: 0,
    recoveringFromError: null,
  },
  channels: {},
  context: {
    spaceId: '',
    initialized: false,
  },
  cursor: zeroEventId,
  notifyTimestamp: 0,
  effects: [],
};

const channelsReducer = (
  channels: ChatSpaceState['channels'],
  action: ChatActionUnion,
  context: ChatReducerContext,
): [ChatSpaceState['channels'], ChatEffect[]] => {
  if ('channelId' in action.payload) {
    const { channelId } = action.payload;
    const channelState = channelReducer(
      channels[channelId] ?? makeInitialChannelState(channelId),
      action,
      context,
    );
    return [{ ...channels, [channelId]: channelState }, []];
  } else {
    const nextChannels: ChatSpaceState['channels'] = {};
    for (const channelState of Object.values(channels)) {
      nextChannels[channelState.id] = channelReducer(channelState, action, context);
    }
    return [nextChannels, []];
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
  cursor: zeroEventId,
  notifyTimestamp: 0,
  effects: [],
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

const handleUpdate = (
  state: ChatSpaceState,
  { payload: update }: ChatAction<'update'>,
): ChatSpaceState => {
  let nextCursor = state.cursor;
  const shouldAdvanceCursor = update.live == null || update.live === 'P';
  if (shouldAdvanceCursor) {
    if (eventIdCompare(update.id, state.cursor) <= 0) {
      return state;
    }
    nextCursor = update.id;
  }
  const updateEffects: ChatEffect[] = (() => {
    switch (update.body.type) {
      case 'CHANNEL_DELETED':
        return [
          {
            type: 'CHANNEL_CHANGED',
            id: createEffectId(),
            spaceId: update.mailbox,
            channelId: update.body.channelId,
            channel: null,
            dedupeKey: `channel:${update.mailbox}:${update.body.channelId}`,
          },
        ];
      case 'CHANNEL_EDITED':
        return [
          {
            type: 'CHANNEL_CHANGED',
            id: createEffectId(),
            spaceId: update.mailbox,
            channelId: update.body.channelId,
            channel: update.body.channel,
            dedupeKey: `channel:${update.mailbox}:${update.body.channelId}`,
          },
        ];
      case 'SPACE_UPDATED': {
        const { space } = update.body.spaceWithRelated;
        return [
          {
            type: 'SPACE_CHANGED',
            id: createEffectId(),
            spaceId: space.id,
            space,
            dedupeKey: `space:${space.id}`,
          },
        ];
      }
      case 'MEMBERS':
        return [
          {
            type: 'MEMBERS_UPDATED',
            id: createEffectId(),
            channelId: update.body.channelId,
            members: update.body.members,
            dedupeKey: `members:${update.body.channelId}`,
          },
        ];
      case 'STATUS_MAP':
        return [
          {
            type: 'STATUS_UPDATED',
            id: createEffectId(),
            spaceId: update.body.spaceId,
            statusMap: update.body.statusMap,
            dedupeKey: `status:${update.body.spaceId}`,
          },
        ];
      case 'ERROR':
      case 'NEW_MESSAGE':
      case 'MESSAGE_DELETED':
      case 'MESSAGE_EDITED':
      case 'MESSAGE_PREVIEW':
      case 'INITIALIZED':
      case 'DIFF':
      case 'APP_INFO':
      case 'APP_UPDATED':
        return [];
    }
  })();
  const chatAction = toChatAction(update);
  if (chatAction == null) {
    const nextState = shouldAdvanceCursor ? { ...state, cursor: nextCursor } : state;
    return updateEffects.length === 0
      ? nextState
      : { ...nextState, effects: mergeEffects(nextState.effects, updateEffects) };
  }
  const nextState = chatReducer(state, chatAction);
  return {
    ...nextState,
    cursor: nextCursor,
    effects:
      updateEffects.length === 0
        ? nextState.effects
        : mergeEffects(nextState.effects, updateEffects),
  };
};

export const chatReducer: Reducer<ChatSpaceState, ChatActionUnion> = (
  state: ChatSpaceState,
  action: ChatActionUnion,
): ChatSpaceState => {
  const { context } = state;
  if (
    action.type === 'resetChatState' ||
    // When the client sleeps for too long, the server may have discarded
    // cached events. In this case, we need to reset the chat state.
    (action.type === 'connectionError' &&
      action.payload.code === 'CURSOR_TOO_OLD' &&
      action.payload.mailboxId === context.spaceId)
  ) {
    return makeChatState(context.spaceId);
  }
  switch (action.type) {
    case 'update':
      return handleUpdate(state, action);
    case 'effectsHandled': {
      if (state.effects.length === 0) return state;
      const handled = new Set(action.payload.effectIds);
      const remaining = state.effects.filter((effect) => !handled.has(effect.id));
      if (remaining.length === state.effects.length) return state;
      return { ...state, effects: remaining };
    }
    case 'spaceUpdated':
      return handleSpaceUpdated(state, action);
    case 'enterSpace':
      return state.context.spaceId === action.payload.spaceId
        ? state
        : makeChatState(action.payload.spaceId);
    case 'channelDeleted':
      return handleChannelDeleted(state, action);
    case 'initialized':
      return { ...state, context: { ...context, initialized: true } };
  }

  const { channels, connection, ...rest } = state;
  let { notifyTimestamp } = state;
  if (action.type === 'receiveMessage') {
    const created = Date.parse(action.payload.message.created);
    if (!Number.isNaN(created)) {
      notifyTimestamp = Math.max(notifyTimestamp, created);
    }
  }

  const [connectionState, connectionEffects] = connectionReducer(connection, action, context);
  const [channelsState, channelEffects] = channelsReducer(channels, action, context);
  const effects =
    connectionEffects.length === 0 && channelEffects.length === 0
      ? state.effects
      : mergeEffects(state.effects, [...connectionEffects, ...channelEffects]);

  return {
    connection: connectionState,
    channels: channelsState,
    ...rest,
    notifyTimestamp,
    effects,
  };
};
