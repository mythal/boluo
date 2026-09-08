import type { AccessPolicy, Character } from '@boluo/api';
import { useQueryChannelList } from '@boluo/hooks/useQueryChannelList';
import { useQueryChannelMembers } from '@boluo/hooks/useQueryChannelMembers';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { useMySpaceMember } from '@boluo/hooks/useQueryMySpaceMember';
import { useQuerySpace } from '@boluo/hooks/useQuerySpace';
import { useCallback } from 'react';

export interface CharacterAccessContext {
  accessPolicy: AccessPolicy;
  ownerId: Character['ownerId'];
  userId: string | null | undefined;
  isResourceMember: boolean;
  isGameMaster: boolean;
  canManageSpace: boolean;
}

// This client-side check only controls whether edit UI is shown; server mutations remain
// authoritative. Keep it aligned with the server's AccessPolicy::can_edit implementation,
// including its resource-membership owner semantics.
export const canEditCharacter = ({
  accessPolicy,
  ownerId,
  userId,
  isResourceMember,
  isGameMaster,
  canManageSpace,
}: CharacterAccessContext): boolean => {
  if (userId == null) return false;
  const isOwner = isResourceMember && ownerId === userId;
  switch (accessPolicy) {
    case 'PUBLIC':
      return canManageSpace || isOwner || isGameMaster;
    case 'COLLABORATIVE':
      return canManageSpace || isResourceMember;
    case 'PERSONAL':
      return isOwner;
    case 'SECRET':
      return isOwner || isGameMaster;
    case 'GAME_MASTER':
      return isGameMaster;
  }
};

export const isCharacterAccessSelectionInvalid = (
  isLoading: boolean,
  hasError: boolean,
  isAllowed: boolean,
): boolean => !isLoading && !hasError && !isAllowed;

export const useCanEditCharacter = (character: Character | undefined): boolean => {
  const { data: currentUser } = useQueryCurrentUser();
  const { data: space } = useQuerySpace(character?.spaceId);
  const { data: mySpaceMember } = useMySpaceMember(character?.spaceId ?? null);
  const { data: accessChannelMembers } = useQueryChannelMembers(
    character?.accessChannelId,
    character?.spaceId,
  );

  if (character == null) return false;
  const myAccessChannelMember = accessChannelMembers?.members.find(
    ({ user }) => user.id === currentUser?.id,
  );
  const hasAccessChannel = character.accessChannelId != null;
  const isResourceMember =
    mySpaceMember != null && (!hasAccessChannel || myAccessChannelMember != null);

  return canEditCharacter({
    accessPolicy: character.accessPolicy,
    ownerId: character.ownerId,
    userId: currentUser?.id,
    isResourceMember,
    isGameMaster: hasAccessChannel
      ? myAccessChannelMember?.channel.isMaster === true
      : mySpaceMember?.isGameMaster === true,
    canManageSpace:
      mySpaceMember?.isAdmin === true || (currentUser != null && currentUser.id === space?.ownerId),
  });
};

export const useCharacterAccessOptions = (character: Character) => {
  const currentUserQuery = useQueryCurrentUser();
  const spaceQuery = useQuerySpace(character.spaceId);
  const spaceMemberQuery = useMySpaceMember(character.spaceId);
  const channelsQuery = useQueryChannelList(character.spaceId);
  const { data: currentUser } = currentUserQuery;
  const { data: space } = spaceQuery;
  const { data: mySpaceMember } = spaceMemberQuery;
  const { data: channels } = channelsQuery;
  const error =
    currentUserQuery.error ??
    spaceQuery.error ??
    spaceMemberQuery.error ??
    channelsQuery.error ??
    null;
  const retry = useCallback(async (): Promise<void> => {
    await Promise.allSettled([
      currentUserQuery.mutate(),
      spaceQuery.mutate(),
      spaceMemberQuery.mutate(),
      channelsQuery.mutate(),
    ]);
  }, [channelsQuery, currentUserQuery, spaceMemberQuery, spaceQuery]);
  const canManageSpace =
    mySpaceMember?.isAdmin === true || (currentUser != null && currentUser.id === space?.ownerId);

  const canUseAccess = useCallback(
    (accessPolicy: AccessPolicy, accessChannelId: string | null): boolean => {
      const channelMember =
        accessChannelId == null
          ? null
          : channels?.find(({ channel }) => channel.id === accessChannelId)?.member;
      return canEditCharacter({
        accessPolicy,
        ownerId: character.ownerId,
        userId: currentUser?.id,
        isResourceMember:
          mySpaceMember != null && (accessChannelId == null || channelMember != null),
        isGameMaster:
          accessChannelId == null
            ? mySpaceMember?.isGameMaster === true
            : channelMember?.isMaster === true,
        canManageSpace,
      });
    },
    [canManageSpace, channels, character.ownerId, currentUser?.id, mySpaceMember],
  );

  return {
    channels,
    error,
    isLoading:
      currentUserQuery.isLoading ||
      spaceQuery.isLoading ||
      spaceMemberQuery.isLoading ||
      channelsQuery.isLoading,
    isRetrying:
      currentUserQuery.isValidating ||
      spaceQuery.isValidating ||
      spaceMemberQuery.isValidating ||
      channelsQuery.isValidating,
    retry,
    canUseAccess,
  };
};
