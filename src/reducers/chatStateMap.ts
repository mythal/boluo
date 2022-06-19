import { SpaceMemberWithUser } from '../api/spaces';
import { List, Map } from 'immutable';
import { Id, newId } from '../utils/id';
import { chatReducer, ChatState } from './chatState';
import { Channel, ChannelMember, makeMembers } from '../api/channels';
import { initialChatItemSet } from '../states/chat-item-set';
import { Action, SpaceLoaded, SpaceUpdated } from '../actions';

export type ChatStateMap = Map<Id, ChatState | undefined>;
const initChatState = (
  channel: Channel,
  channelMembers: Record<Id, ChannelMember[] | undefined>,
  spaceMembers: Record<Id, SpaceMemberWithUser | undefined>
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
    eventAfter: 0,
    itemSet: initialChatItemSet,
    lastLoadBefore: Number.MAX_SAFE_INTEGER,
    compose: {
      initialized: false,
      inputName: '',
      entities: [],
      sending: false,
      editFor: null,
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
        return initChatState(channel, spaceWithRelated.channelMembers, spaceWithRelated.members);
      } else {
        const members = makeMembers(channel.id, spaceWithRelated.members, spaceWithRelated.channelMembers);
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
      initChatState(channel, spaceWithRelated.channelMembers, spaceWithRelated.members)
    );
  }
  return chatStates;
};

export const chatStateMapReducer = (state: ChatStateMap, action: Action, userId: Id | undefined): ChatStateMap => {
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
