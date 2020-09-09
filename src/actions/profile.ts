import { Settings, User } from '../api/users';
import { Space, SpaceMember, SpaceWithMember } from '../api/spaces';
import { Channel, ChannelMember, ChannelWithMember } from '../api/channels';
import { Id } from '../utils/id';

export interface LoggedIn {
  type: 'LOGGED_IN';
  user: User;
  settings: Settings;
  mySpaces: SpaceWithMember[];
  myChannels: ChannelWithMember[];
}

export interface SettingsUpdated {
  type: 'SETTINGS_UPDATED';
  settings: Settings;
}

export interface UserEdited {
  type: 'USER_EDITED';
  user: User;
}

export interface LoggedOut {
  type: 'LOGGED_OUT';
}

export interface JoinedSpace {
  type: 'JOINED_SPACE';
  space: Space;
  member: SpaceMember;
}

export interface SpaceEdited {
  type: 'SPACE_EDITED';
  space: Space;
}

export interface LeftSpace {
  type: 'LEFT_SPACE';
  spaceId: Id;
}

export interface JoinedChannel {
  type: 'JOINED_CHANNEL';
  channel: Channel;
  member: ChannelMember;
}

export interface LeftChannel {
  type: 'LEFT_CHANNEL';
  id: Id;
}

export interface ChannelMemberEdited {
  type: 'CHANNEL_MEMBER_EDITED';
  channelId: Id;
  member: ChannelMember;
}
