import { User } from '../api/users';
import { Space, SpaceMember, SpaceWithMember } from '../api/spaces';
import { Channel, ChannelMember, ChannelWithMember } from '../api/channels';
import { Id } from '../id';

export type Action =
  | LoggedIn
  | LoggedOut
  | JoinedSpace
  | LeftSpace
  | ShowInformation
  | JoinedChannel
  | LeftChannel
  | ChannelMemberEdited
  | SpaceEdited;

export const LOGGED_IN = 'LOGGED_IN';
export type LOGGED_IN = typeof LOGGED_IN;
export interface LoggedIn {
  tag: LOGGED_IN;
  user: User;
  mySpaces: SpaceWithMember[];
  myChannels: ChannelWithMember[];
}

export const LOGGED_OUT = 'LOGGED_OUT';
export type LOGGED_OUT = typeof LOGGED_OUT;
export interface LoggedOut {
  tag: LOGGED_OUT;
}

export const JOINED_SPACE = 'JOINED_SPACE';
export type JOINED_SPACE = typeof JOINED_SPACE;
export interface JoinedSpace {
  tag: JOINED_SPACE;
  space: Space;
  member: SpaceMember;
}

export const SPACE_EDITED = 'SPACE_EDITED';
export type SPACE_EDITED = typeof SPACE_EDITED;
export interface SpaceEdited {
  tag: SPACE_EDITED;
  space: Space;
}

export const LEFT_SPACE = 'LEFT_SPACE';
export type LEFT_SPACE = typeof LEFT_SPACE;
export interface LeftSpace {
  tag: LEFT_SPACE;
  id: string;
}

export const LEFT_CHANNEL = 'LEFT_CHANNEL';
export type LEFT_CHANNEL = typeof LEFT_CHANNEL;
export interface LeftChannel {
  tag: LEFT_CHANNEL;
  id: string;
}

export const SHOW_INFORMATION = 'SHOW_INFORMATION';
export type SHOW_INFORMATION = typeof SHOW_INFORMATION;
export interface ShowInformation {
  tag: SHOW_INFORMATION;
  level: ERROR | SUCCESS | INFO;
  message: string;
}

export const ERROR = 'ERROR';
export type ERROR = typeof ERROR;

export const SUCCESS = 'SUCCESS';
export type SUCCESS = typeof SUCCESS;

export const INFO = 'INFO';
export type INFO = typeof INFO;

export const JOINED_CHANNEL = 'JOINED_CHANNEL';
export type JOINED_CHANNEL = typeof JOINED_CHANNEL;
export interface JoinedChannel {
  tag: JOINED_CHANNEL;
  channel: Channel;
  member: ChannelMember;
}

export const CHANNEL_MEMBER_EDITED = 'CHANNEL_MEMBER_EDITED';
export type CHANNEL_MEMBER_EDITED = typeof CHANNEL_MEMBER_EDITED;
export interface ChannelMemberEdited {
  tag: CHANNEL_MEMBER_EDITED;
  channelId: Id;
  member: ChannelMember;
}
