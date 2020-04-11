import { User } from '../api/users';
import { OrderedMap } from 'immutable';
import { Id } from '../utils';
import { SpaceWithMember } from '../api/spaces';
import { ChannelWithMember } from '../api/channels';
import { Action } from '../actions';
import { ChannelMemberEdited, JoinedChannel, JoinedSpace, LeftChannel, LeftSpace, LoggedIn } from '../actions/profile';
import { ChannelEdited, PushMembers } from '../api/events';

export type MySpaces = OrderedMap<Id, SpaceWithMember>;
export type MyChannels = OrderedMap<Id, ChannelWithMember>;

export interface ProfileState {
  user: User;
  spaces: MySpaces;
  channels: MyChannels;
}

const login = (state: ProfileState | undefined, action: LoggedIn): ProfileState => {
  const { user } = action;
  let spaces: OrderedMap<Id, SpaceWithMember> = OrderedMap();
  let channels: OrderedMap<Id, ChannelWithMember> = OrderedMap();
  for (const s of action.mySpaces) {
    spaces = spaces.set(s.space.id, s);
  }
  for (const c of action.myChannels) {
    channels = channels.set(c.channel.id, c);
  }

  return { user, channels, spaces };
};

const joinSpace = (state: ProfileState, { space, member }: JoinedSpace) => {
  const spaces = state.spaces.set(space.id, { space, member });
  return { ...state, spaces };
};

const leaveSpace = (state: ProfileState, { id }: LeftSpace): ProfileState => {
  const spaces = state.spaces.remove(id);
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

const editChannelMember = (state: ProfileState, { channelId, member }: ChannelMemberEdited): ProfileState => {
  const channel = state.channels.get(channelId)?.channel;
  if (!channel) {
    return state;
  }
  const channels = state.channels.set(channelId, { channel, member });
  return { ...state, channels };
};

const editChannelMemberByList = (state: ProfileState, channelId: Id, event: PushMembers): ProfileState => {
  const member = event.members.find((member) => member.user.id === state.user.id);
  if (!member) {
    return state;
  }
  const { user } = member;
  let { channels, spaces } = state;
  const channelWithMember = channels.get(member.channel.channelId, undefined);
  if (channelWithMember !== undefined) {
    channels = channels.set(member.channel.channelId, { ...channelWithMember, member: member.channel });
  }
  const spaceWithMember = spaces.get(member.space.spaceId, undefined);
  if (spaceWithMember !== undefined) {
    spaces = spaces.set(member.space.spaceId, { ...spaceWithMember, member: member.space });
  }
  return { channels, spaces, user };
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

export const profileReducer = (state: ProfileState | undefined, action: Action): ProfileState | undefined => {
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
    case 'JOINED_SPACE':
      return joinSpace(state, action);
    case 'LEFT_SPACE':
      return leaveSpace(state, action);
    case 'JOINED_CHANNEL':
      return joinChannel(state, action);
    case 'LEFT_CHANNEL':
      return leaveChannel(state, action);
    case 'CHANNEL_MEMBER_EDITED':
      return editChannelMember(state, action);
    case 'CHANNEL_EVENT_RECEIVED':
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
