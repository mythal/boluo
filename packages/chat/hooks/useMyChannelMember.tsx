import type { Member } from '@boluo/api';
import { useMe } from '@boluo/common';
import { useQueryChannelMembers } from './useQueryChannelMembers';

export const useMyChannelMember = (channelId: string): Member | 'LOADING' | null => {
  const { data: members, isLoading } = useQueryChannelMembers(channelId);
  const me = useMe();
  if (me === 'LOADING' || isLoading) return 'LOADING';
  if (!me) return null;
  return members?.members.find((member) => member.user.id === me.user.id) ?? null;
};
