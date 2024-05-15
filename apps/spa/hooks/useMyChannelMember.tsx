import type { ApiError, Member } from '@boluo/api';
import { useQueryCurrentUser } from '@boluo/common';
import { useQueryChannelMembers } from './useQueryChannelMembers';
import { Result, Err, Ok } from '@boluo/utils';

export type MyChannelMemberResult = Result<
  Member,
  'LOADING' | 'NOT_FOUND_MEMBER' | 'NOT_FOUND_CURRENT_USER' | ApiError
>;

export const useMyChannelMember = (channelId: string): MyChannelMemberResult => {
  const { data: currentUser, isLoading: isCurrentUserLoading, error: fetchUserError } = useQueryCurrentUser();
  const { data: members, isLoading, error: fetchMembersError } = useQueryChannelMembers(channelId, {});
  if (isCurrentUserLoading || isLoading) {
    return new Err('LOADING');
  }
  const error = fetchMembersError ?? fetchUserError;
  if (error) {
    return new Err(error);
  }
  if (!currentUser) {
    return new Err('NOT_FOUND_CURRENT_USER');
  }
  const myMember = members?.members.find((member) => member.user.id === currentUser.id);
  return myMember ? new Ok(myMember) : new Err('NOT_FOUND_MEMBER');
};
