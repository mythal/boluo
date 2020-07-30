import { Space, SpaceMember } from './spaces';
import { User } from './users';
import { Id } from '@/utils/id';

export interface CreateChannel {
  spaceId: Id;
  name: string;
  characterName: string;
  defaultDiceType: string | null;
}

export interface Channel {
  id: Id;
  name: string;
  topic: string;
  spaceId: string;
  created: number;
  isPublic: boolean;
  defaultDiceType: string;
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

export interface Member {
  channel: ChannelMember;
  space: SpaceMember;
  user: User;
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
  name: string | null;
  topic: string | null;
  defaultDiceType: string | null;
}

export interface EditChannelMember {
  channelId: Id;
  characterName?: string;
  textColor?: string;
}
