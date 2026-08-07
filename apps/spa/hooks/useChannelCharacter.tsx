import type { Character, MemberWithUser } from '@boluo/api';
import { useQueryCharacter } from '@boluo/hooks/useQueryCharacter';

interface ChannelCharacter {
  character: Character | undefined;
  name: string;
}

export const useChannelCharacter = (
  member: MemberWithUser | null,
  enabled = true,
): ChannelCharacter => {
  const characterId = enabled ? member?.channel.characterId : null;
  const { data: character } = useQueryCharacter(member?.space.spaceId, characterId ?? undefined);

  if (member == null) return { character, name: '' };
  if (characterId == null) {
    return { character, name: member.channel.characterName };
  }
  return { character, name: character?.name ?? member.channel.characterName };
};

export const useChannelCharacterName = (member: MemberWithUser | null): string =>
  useChannelCharacter(member).name;
