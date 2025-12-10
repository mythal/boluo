import { type Id } from '../utils/id';
import { type Space, type SpaceMember, type SpaceMemberWithUser } from './spaces';
import { type User } from './users';

export interface CreateChannel {
  spaceId: Id;
  name: string;
  characterName: string;
  defaultDiceType?: string;
  isPublic?: boolean;
}

export interface Channel {
  id: Id;
  name: string;
  topic: string;
  spaceId: string;
  created: number;
  isPublic: boolean;
  defaultDiceType: string;
  defaultRollCommand: string;
}

export interface ChannelMember {
  userId: Id;
  channelId: Id;
  joinDate: number;
  characterName: string;
  isMaster: boolean;
  textColor: string | null;
}

export interface ChannelMemberWithUser {
  member: ChannelMember;
  user: User;
}

export interface ChannelWithMember {
  channel: Channel;
  member: ChannelMember;
}

export interface MemberWithUser {
  channel: ChannelMember;
  space: SpaceMember;
  user: User;
}

export interface ChannelMembers {
  members: MemberWithUser[];
  colorList: Record<Id, string>;
  heartbeatMap: Record<Id, number>;
}

export interface JoinChannel {
  channelId: Id;
  characterName?: string;
}

export interface AddMember {
  channelId: Id;
  userId: Id;
}

export interface ChannelWithRelated {
  channel: Channel;
  members: MemberWithUser[];
  space: Space;
  colorList: Record<Id, string>;
  heartbeatMap: Record<Id, number>;
  encodedEvents: string[];
}

export interface EditChannel {
  channelId: Id;
  name: string | null;
  topic: string | null;
  defaultDiceType?: string;
  defaultRollCommand?: string;
  isPublic?: boolean;
  grantMasters?: Id[];
  removeMasters?: Id[];
}

export interface EditChannelMember {
  channelId: Id;
  characterName?: string;
  textColor?: string;
}

export interface CheckChannelName {
  spaceId: Id;
  name: string;
}

export interface Export {
  channelId: Id;
  after?: string;
}

export const makeMembers = (
  channelId: Id,
  spaceMemberMap: Record<Id, SpaceMemberWithUser | undefined>,
  channelMemberMap: Record<Id, ChannelMember[] | undefined>,
): MemberWithUser[] => {
  const members = [];
  const channelMemberList = channelMemberMap[channelId];
  if (!channelMemberList) {
    return [];
  }
  for (const channelMember of channelMemberList) {
    if (channelMember.channelId !== channelId) {
      continue;
    }
    const spaceMemberWithUser = spaceMemberMap[channelMember.userId];
    if (!spaceMemberWithUser) {
      continue;
    }
    const { space, user } = spaceMemberWithUser;
    members.push({ space, user, channel: channelMember });
  }
  return members;
};
