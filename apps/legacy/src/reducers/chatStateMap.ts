import { List, Map } from 'immutable';
import { type Action, type SpaceLoaded, type SpaceUpdated } from '../actions';
import { type Channel, type ChannelMember, makeMembers } from '../api/channels';
import { type SpaceMemberWithUser } from '../api/spaces';
import { initialChatItemSet } from '../states/chat-item-set';
import { type Id, newId } from '../utils/id';
import { chatReducer, type ChatState } from './chatState';

export type ChatStateMap = Map<Id, ChatState | undefined>;
const initChatState = (
  channel: Channel,
  channelMembers: Record<Id, ChannelMember[] | undefined>,
  spaceMembers: Record<Id, SpaceMemberWithUser | undefined>,
): ChatState => {
  const members = makeMembers(channel.id, spaceMembers, channelMembers);
  return {
    channel,
    members,
    colorMap: Map<Id, string>(),
    postponed: List(),
    moving: false,
    showFolded: false,
    filter: 'NONE',
    finished: false,
    initialized: false,
    eventAfter: { seq: 0, node: 0, timestamp: 0 },
    itemSet: initialChatItemSet,
    lastLoadBefore: Number.MAX_SAFE_INTEGER,
    compose: {
      initialized: false,
      inputName: '',
      entities: [],
      sending: false,
      edit: null,
      messageId: newId(),
      media: undefined,
      isAction: false,
      source: '',
      whisperTo: null,
      inGame: false,
      broadcast: true,
    },
  };
};
export const handleSpaceUpdate = (state: ChatStateMap, action: SpaceUpdated): ChatStateMap => {
  const spaceWithRelated = action.spaceWithRelated;
  let chatStates = Map<Id, ChatState | undefined>();
  for (const channel of spaceWithRelated.channels) {
    chatStates = state.update(channel.id, (prevChatState) => {
      if (prevChatState === undefined) {
        const nextState = initChatState(
          channel,
          spaceWithRelated.channelMembers,
          spaceWithRelated.members,
        );
        nextState.initialized = true;
        return nextState;
      } else {
        const members = makeMembers(
          channel.id,
          spaceWithRelated.members,
          spaceWithRelated.channelMembers,
        );
        return { ...prevChatState, channel, members };
      }
    });
  }
  return chatStates;
};
export const handleSpaceLoaded = (state: ChatStateMap, action: SpaceLoaded): ChatStateMap => {
  if (action.result.isErr) {
    return state;
  }
  const spaceWithRelated = action.result.value;
  let chatStates = Map<Id, ChatState>();
  for (const channel of spaceWithRelated.channels) {
    chatStates = chatStates.set(
      channel.id,
      initChatState(channel, spaceWithRelated.channelMembers, spaceWithRelated.members),
    );
  }
  return chatStates;
};

export const chatStateMapReducer = (
  state: ChatStateMap,
  action: Action,
  userId: Id | undefined,
): ChatStateMap => {
  if (action.type === 'SPACE_LOADED') {
    state = handleSpaceLoaded(state, action);
  } else if (action.type === 'SPACE_UPDATED') {
    state = handleSpaceUpdate(state, action);
  } else if ('pane' in action) {
    state = state.update(action.pane, (chatState) => chatReducer(chatState, action, userId));
  } else {
    state = state.map((chat) => chatReducer(chat, action, userId));
  }
  return state;
};
