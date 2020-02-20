import { GUEST, State } from './states';
import {
  Action,
  CHANNEL_MEMBER_EDITED,
  ChannelMemberEdited,
  JOINED_CHANNEL,
  JOINED_SPACE,
  JoinedChannel,
  JoinedSpace,
  LEFT_CHANNEL,
  LEFT_SPACE,
  LeftChannel,
  LeftSpace,
  LOGGED_IN,
  LOGGED_OUT,
  LoggedIn,
  SHOW_INFORMATION,
  ShowInformation,
  SPACE_EDITED,
  SpaceEdited,
} from './actions';
import { OrderedMap } from 'immutable';
import { SpaceWithMember } from '../api/spaces';
import { ChannelWithMember } from '../api/channels';
import { Id } from '../id';

const handleLogin = (state: State, action: LoggedIn): State => {
  const me = action.user;
  let mySpaces: OrderedMap<Id, SpaceWithMember> = OrderedMap();
  let myChannels: OrderedMap<Id, ChannelWithMember> = OrderedMap();
  for (const s of action.mySpaces) {
    mySpaces = mySpaces.set(s.space.id, s);
  }
  for (const c of action.myChannels) {
    myChannels = myChannels.set(c.channel.id, c);
  }
  return { ...state, me, mySpaces, myChannels };
};

const handleLogout = (state: State): State => {
  return {
    ...state,
    mySpaces: OrderedMap(),
    myChannels: OrderedMap(),
    me: GUEST,
  };
};

const handleJoinSpace = (state: State, { space, member }: JoinedSpace): State => {
  const mySpaces = state.mySpaces.set(space.id, { space, member });
  return { ...state, mySpaces };
};

const handleLeaveSpace = (state: State, { id }: LeftSpace): State => {
  const mySpaces = state.mySpaces.remove(id);
  const myChannels = state.myChannels.filter(({ channel }) => channel.spaceId !== id);
  return { ...state, mySpaces, myChannels };
};

const handleEditSpace = (state: State, { space }: SpaceEdited): State => {
  const spaceWithMember = state.mySpaces.get(space.id);
  if (!spaceWithMember) {
    return state;
  }
  const mySpaces = state.mySpaces.set(space.id, { ...spaceWithMember, space });
  return { ...state, mySpaces };
};

const handleJoinChannel = (state: State, { channel, member }: JoinedChannel): State => {
  const myChannels = state.myChannels.set(channel.id, { channel, member });
  return { ...state, myChannels };
};

const handleChannelMemberEdited = (state: State, { channelId, member }: ChannelMemberEdited): State => {
  const channel = state.myChannels.get(channelId)?.channel;
  if (!channel) {
    return state;
  }
  const myChannels = state.myChannels.set(channelId, { channel, member });
  return { ...state, myChannels };
};

const handleLeaveChannel = (state: State, { id }: LeftChannel): State => {
  const myChannels = state.myChannels.remove(id);
  return { ...state, myChannels };
};

const handleShowInformation = (state: State, { level, message }: ShowInformation): State => {
  const created = new Date().getTime();
  const informationList = state.informationList.push({ level, message, created });
  return { ...state, informationList };
};

export const reducer = (state: State, action: Action): State => {
  console.log(action);
  switch (action.tag) {
    case LOGGED_IN:
      return handleLogin(state, action);
    case LOGGED_OUT:
      return handleLogout(state);
    case JOINED_SPACE:
      return handleJoinSpace(state, action);
    case SPACE_EDITED:
      return handleEditSpace(state, action);
    case LEFT_SPACE:
      return handleLeaveSpace(state, action);
    case LEFT_CHANNEL:
      return handleLeaveChannel(state, action);
    case JOINED_CHANNEL:
      return handleJoinChannel(state, action);
    case CHANNEL_MEMBER_EDITED:
      return handleChannelMemberEdited(state, action);
    case SHOW_INFORMATION:
      return handleShowInformation(state, action);
    default:
      return state;
  }
};
