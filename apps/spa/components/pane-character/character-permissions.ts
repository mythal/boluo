import type { AccessPolicy, Character } from '@boluo/api';
import { useQueryChannelMembers } from '@boluo/hooks/useQueryChannelMembers';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { useMySpaceMember } from '@boluo/hooks/useQueryMySpaceMember';
import { useQuerySpace } from '@boluo/hooks/useQuerySpace';

interface CharacterEditAccess {
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
}: CharacterEditAccess): boolean => {
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
