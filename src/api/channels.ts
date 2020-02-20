import { Space } from './spaces';
import { Id } from '../id';

export interface CreateChannel {
  spaceId: Id;
  name: string;
}

export interface Channel {
  id: Id;
  name: string;
  topic: string;
  spaceId: string;
  created: number;
  isPublic: boolean;
}

export interface ChannelMember {
  userId: Id;
  channelId: Id;
  joinDate: number;
  characterName: string;
  isMaster: boolean;
  textColor: string | null;
}

export interface ChannelWithMember {
  channel: Channel;
  member: ChannelMember;
}

export interface JoinChannel {
  channelId: Id;
  characterName?: string;
}

export interface ColorList {
  [userId: string]: string;
}

export interface ChannelWithRelated {
  channel: Channel;
  members: ChannelMember[];
  space: Space;
  colorList: ColorList;
}

export interface EditChannel {
  channelId: Id;
  name: string;
}

export interface EditChannelMember {
  channelId: Id;
  characterName?: string;
  textColor?: string;
}
