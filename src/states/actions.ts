import { User } from '../api/users';
import { Space, SpaceMember, SpaceWithMember } from '../api/spaces';
import { Channel, ChannelMember, ChannelWithMember, ChannelWithRelated } from '../api/channels';
import { Id } from '../id';
import { Message } from '../api/messages';
import { ChannelEvent } from '../api/events';

export interface LoggedIn {
  type: 'LOGGED_IN';
  user: User;
  mySpaces: SpaceWithMember[];
  myChannels: ChannelWithMember[];
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
  id: Id;
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

export interface NewAlert {
  type: 'NEW_ALERT';
  level: 'ERROR' | 'SUCCESS' | 'INFO';
  message: string;
}

export interface ToggleSidebar {
  type: 'TOGGLE_SIDEBAR';
}

export interface LoadChat {
  type: 'LOAD_CHAT';
  channelWithRelated: ChannelWithRelated;
}

export interface ReloadChat {
  type: 'RELOAD_CHAT';
  channelWithRelated: ChannelWithRelated;
}

export interface CloseChat {
  type: 'CLOSE_CHAT';
  id: Id;
}

export interface LoadMessages {
  type: 'LOAD_MESSAGES';
  messages: Message[];
  finished: boolean;
}

export interface ChannelEventReceived {
  type: 'CHANNEL_EVENT_RECEIVED';
  event: ChannelEvent;
}

export type Action =
  | LoggedIn
  | LoggedOut
  | JoinedSpace
  | SpaceEdited
  | LeftSpace
  | JoinedChannel
  | LeftChannel
  | ChannelMemberEdited
  | NewAlert
  | ToggleSidebar
  | LoadChat
  | ChannelEventReceived
  | LoadMessages
  | CloseChat;
