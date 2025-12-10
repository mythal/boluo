import { OrderedMap } from 'immutable';
import {
  type Action,
  type ChannelMemberEdited,
  type JoinedChannel,
  type JoinedSpace,
  type LeftChannel,
  type LeftSpace,
  type LoggedIn,
  type SettingsUpdated,
  type UserEdited,
} from '../actions';
import { type ChannelWithMember } from '../api/channels';
import { type ChannelEdited, type PushMembers } from '../api/events';
import { type SpaceWithMember, type SpaceWithRelated } from '../api/spaces';
import { type Settings, type User } from '../api/users';
import { type Id } from '../utils/id';
import { type ChatState } from './chatState';

export type MySpaces = OrderedMap<Id, SpaceWithMember>;
export type MyChannels = OrderedMap<Id, ChannelWithMember>;

export interface ProfileState {
  user: User;
  spaces: MySpaces;
  channels: MyChannels;
  settings: Settings;
}

const login = (state: ProfileState | undefined, action: LoggedIn): ProfileState => {
  const { user, settings } = action;
  let spaces: OrderedMap<Id, SpaceWithMember> = OrderedMap<Id, SpaceWithMember>();
  let channels: OrderedMap<Id, ChannelWithMember> = OrderedMap<Id, ChannelWithMember>();
  for (const s of action.mySpaces) {
    spaces = spaces.set(s.space.id, s);
  }
  for (const c of action.myChannels) {
    channels = channels.set(c.channel.id, c);
  }

  return { user, channels, spaces, settings };
};

const editUser = (
  { channels, spaces, settings }: ProfileState,
  { user }: UserEdited,
): ProfileState => {
  return { user, channels, spaces, settings };
};

const joinSpace = (state: ProfileState, { space, member }: JoinedSpace) => {
  const spaces = state.spaces.set(space.id, { space, member });
  return { ...state, spaces };
};

const leaveSpace = (state: ProfileState, { spaceId }: LeftSpace): ProfileState => {
  const spaces = state.spaces.remove(spaceId);
  return { ...state, spaces };
};

const joinChannel = (state: ProfileState, { channel, member }: JoinedChannel): ProfileState => {
  const channels = state.channels.set(channel.id, { channel, member });
  return { ...state, channels };
};

const leaveChannel = (state: ProfileState, { id }: LeftChannel): ProfileState => {
  const channels = state.channels.remove(id);
  return { ...state, channels };
};

const editChannelMember = (
  state: ProfileState,
  { channelId, member }: ChannelMemberEdited,
): ProfileState => {
  const channel = state.channels.get(channelId)?.channel;
  if (!channel) {
    return state;
  }
  const channels = state.channels.set(channelId, { channel, member });
  return { ...state, channels };
};

const editChannelMemberByList = (
  state: ProfileState,
  channelId: Id,
  event: PushMembers,
): ProfileState => {
  const { settings } = state;
  const member = event.members.find((member) => member.user.id === state.user.id);
  if (!member) {
    return state;
  }
  const { user } = member;
  let { channels, spaces } = state;
  const channelWithMember = channels.get(member.channel.channelId, undefined);
  if (channelWithMember !== undefined) {
    channels = channels.set(member.channel.channelId, {
      ...channelWithMember,
      member: member.channel,
    });
  }
  const spaceWithMember = spaces.get(member.space.spaceId, undefined);
  if (spaceWithMember !== undefined) {
    spaces = spaces.set(member.space.spaceId, { ...spaceWithMember, member: member.space });
  }
  return { channels, spaces, user, settings };
};

export const editChannel = (state: ProfileState, { channel }: ChannelEdited): ProfileState => {
  const channelWithMember = state.channels.get(channel.id, undefined);
  if (channelWithMember === undefined) {
    return state;
  }
  const next: ChannelWithMember = { ...channelWithMember, channel };
  const channels = state.channels.set(channel.id, next);
  return { ...state, channels };
};

function updateSpace(state: ProfileState, { space, members }: SpaceWithRelated): ProfileState {
  const member = members[state.user.id];
  if (member) {
    const spaces = state.spaces.set(space.id, { space, member: member.space });
    return { ...state, spaces };
  } else if (state.spaces.get(space.id)) {
    const spaces = state.spaces.remove(space.id);
    return { ...state, spaces };
  }
  return state;
}

function removeSpace(state: ProfileState, spaceId: Id): ProfileState {
  const spaces = state.spaces.remove(spaceId);
  return { ...state, spaces };
}

function updateSettings(state: ProfileState, { settings }: SettingsUpdated): ProfileState {
  return { ...state, settings };
}

function updateChannel(state: ProfileState, chat: ChatState): ProfileState {
  const myMember = chat.members.find((member) => member.user.id === state.user.id);
  const { channel } = chat;
  if (!myMember) {
    if (!state.channels.has(channel.id)) {
      return state;
    }
    const channels = state.channels.filter(
      (channelWithMember) => channelWithMember.channel.id !== channel.id,
    );
    return { ...state, channels };
  }
  const { user } = myMember;
  const channels = state.channels.set(chat.channel.id, { channel, member: myMember.channel });
  return { ...state, user, channels };
}

export const profileReducer = (
  state: ProfileState | undefined,
  action: Action,
): ProfileState | undefined => {
  switch (action.type) {
    case 'LOGGED_IN':
      return login(state, action);
    case 'LOGGED_OUT':
      return undefined;
  }

  if (state === undefined) {
    return undefined;
  }
  switch (action.type) {
    case 'USER_EDITED':
      return editUser(state, action);
    case 'JOINED_SPACE':
      return joinSpace(state, action);
    case 'LEFT_SPACE':
      return leaveSpace(state, action);
    case 'JOINED_CHANNEL':
      return joinChannel(state, action);
    case 'SPACE_DELETED':
      return removeSpace(state, action.spaceId);
    case 'SPACE_UPDATED':
      return updateSpace(state, action.spaceWithRelated);
    case 'SPACE_LOADED':
      if (action.result.isOk) {
        return updateSpace(state, action.result.value);
      }
      break;
    case 'CHAT_LOADED':
      return updateChannel(state, action.chat);
    case 'LEFT_CHANNEL':
      return leaveChannel(state, action);
    case 'CHANNEL_MEMBER_EDITED':
      return editChannelMember(state, action);
    case 'SETTINGS_UPDATED':
      return updateSettings(state, action);
    case 'EVENT_RECEIVED':
      switch (action.event.body.type) {
        case 'CHANNEL_EDITED':
          return editChannel(state, action.event.body);
        case 'MEMBERS':
          return editChannelMemberByList(state, action.event.mailbox, action.event.body);
      }
  }
  return state;
};

export const initProfileState = undefined;
