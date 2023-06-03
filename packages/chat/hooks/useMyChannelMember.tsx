import type { Member } from 'api';
import { useMe } from 'common';
import { useChannelMembers } from './useChannelMembers';

export const useMyChannelMember = (channelId: string): Member | null => {
  const members = useChannelMembers(channelId);
  const me = useMe();
  if (!me) return null;
  return members.members.find((member) => member.user.id === me.user.id) ?? null;
};
