import type {
  AddChannelMember,
  Channel,
  ChannelMember,
  ChannelMemberWithUser,
  ChannelMembers,
  ChannelWithMaybeMember,
  ChannelWithMember,
  ChannelWithRelated,
  CheckChannelName,
  CreateChannel,
  EditChannel,
  EditChannelMember,
  Export,
  JoinChannel,
  MemberWithUser,
  SpaceMemberWithUser,
} from '@boluo/api';
import { type Id } from '../utils/id';

export type AddMember = AddChannelMember;
export type {
  Channel,
  ChannelMember,
  ChannelMemberWithUser,
  ChannelMembers,
  ChannelWithMaybeMember,
  ChannelWithMember,
  ChannelWithRelated,
  CheckChannelName,
  CreateChannel,
  EditChannel,
  EditChannelMember,
  Export,
  JoinChannel,
  MemberWithUser,
};

export const makeMembers = (
  channelId: Id,
  spaceMemberMap: Record<Id, SpaceMemberWithUser | undefined>,
  channelMemberMap: Record<Id, ChannelMember[] | undefined>,
): MemberWithUser[] => {
  const members: MemberWithUser[] = [];
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
