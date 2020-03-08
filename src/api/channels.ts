import { Space, SpaceMember } from './spaces';
import { Id } from '../id';
import { User } from './users';

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
  online?: boolean;
}

export interface ChannelWithMember {
  channel: Channel;
  member: ChannelMember;
}

export interface Member {
  channel: ChannelMember;
  space: SpaceMember;
  user: User;
  online: boolean;
}

export interface JoinChannel {
  channelId: Id;
  characterName?: string;
}

export interface ChannelWithRelated {
  channel: Channel;
  members: Member[];
  space: Space;
  colorList: { [userId: string]: string };
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
