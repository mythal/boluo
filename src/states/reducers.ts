import { State } from './states';
import {
  Action,
  ChannelMemberEdited,
  JoinedChannel,
  JoinedSpace,
  LeftChannel,
  LeftSpace,
  LoggedIn,
  NewAlert,
  SpaceEdited,
} from './actions';
import { OrderedMap } from 'immutable';
import { ChannelWithMember } from '../api/channels';
import { Id } from '../id';
import { SpaceWithMember } from '../api/spaces';

type Reducer<T extends Action = Action> = (state: State, action: T) => State;

const login: Reducer<LoggedIn> = (state, action) => {
  const profile = action.user;
  let spaces: OrderedMap<Id, SpaceWithMember> = OrderedMap();
  let channels: OrderedMap<Id, ChannelWithMember> = OrderedMap();
  for (const s of action.mySpaces) {
    spaces = spaces.set(s.space.id, s);
  }
  for (const c of action.myChannels) {
    channels = channels.set(c.channel.id, c);
  }

  return { ...state, my: { profile, channels, spaces } };
};

const logout: Reducer = state => {
  return {
    ...state,
    my: 'GUEST',
  };
};

const joinSpace: Reducer<JoinedSpace> = (state, { space, member }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const spaces = my.spaces.set(space.id, { space, member });
  return { ...state, my: { ...my, spaces } };
};

const editSpace: Reducer<SpaceEdited> = (state, { space }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const member = my.spaces.get(space.id)?.member;
  if (!member) {
    return state;
  }
  const spaces = my.spaces.set(space.id, { space, member });
  return { ...state, my: { ...my, spaces } };
};

const leaveSpace: Reducer<LeftSpace> = (state, { id }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const spaces = my.spaces.remove(id);
  return { ...state, my: { ...my, spaces } };
};

const joinChannel: Reducer<JoinedChannel> = (state, { channel, member }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const channels = my.channels.set(channel.id, { channel, member });
  return { ...state, my: { ...my, channels } };
};

const leaveChannel: Reducer<LeftChannel> = (state, { id }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const channels = my.channels.remove(id);
  return { ...state, my: { ...my, channels } };
};

const editChannelMember: Reducer<ChannelMemberEdited> = (state, { channelId, member }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const channel = my.channels.get(channelId)?.channel;
  if (!channel) {
    return state;
  }
  const channels = my.channels.set(channelId, { channel, member });
  return { ...state, my: { ...my, channels } };
};

const toggleSidebar: Reducer = state => {
  const { appearance } = state;
  const sidebar = !appearance.sidebar;
  return { ...state, appearance: { ...appearance, sidebar } };
};

const newAlert: Reducer<NewAlert> = (state, { level, message }) => {
  let { alertList } = state;
  const created = new Date().getTime();
  alertList = alertList.push({ level, message, created });
  return { ...state, alertList };
};

export const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'LOGGED_IN':
      return login(state, action);
    case 'LOGGED_OUT':
      return logout(state, action);
    case 'TOGGLE_SIDEBAR':
      return toggleSidebar(state, action);
    case 'JOINED_SPACE':
      return joinSpace(state, action);
    case 'LEFT_SPACE':
      return leaveSpace(state, action);
    case 'SPACE_EDITED':
      return editSpace(state, action);
    case 'CHANNEL_MEMBER_EDITED':
      return editChannelMember(state, action);
    case 'JOINED_CHANNEL':
      return joinChannel(state, action);
    case 'LEFT_CHANNEL':
      return leaveChannel(state, action);
    case 'NEW_ALERT':
      return newAlert(state, action);
  }
  return state;
};
