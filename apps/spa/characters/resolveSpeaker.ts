import type { Character } from '@boluo/api';
import type { AsTarget } from '@boluo/interpreter';

export type CharacterResolution =
  | { status: 'Loading' }
  | { status: 'Error' }
  | { status: 'NotFound' }
  | { status: 'Found'; character: Character };

export interface SpeakerAttribution {
  characterId: string | null;
  portraitId?: string | null;
  name: string;
  color?: string;
  inGame: boolean;
}

export type ResolvedSpeaker =
  | {
      type: 'Resolved';
      source: 'User' | 'TemporaryName' | 'Character' | 'Editing';
      name: string;
      inGame: boolean;
      characterId: string | null;
      color?: string;
      portraitId?: string | null;
      character?: Character;
    }
  | {
      type: 'InvalidCharacterReference';
      identifier: string;
      reason: Exclude<CharacterResolution['status'], 'Found'>;
    };

interface ResolveSpeakerOptions {
  nickname: string;
  defaultInGame: boolean;
  parsedInGame: boolean | null;
  asTarget: AsTarget | null;
  editingAttribution?: SpeakerAttribution;
  channelCharacterId: string | null;
  channelCharacterName: string;
  channelCharacter?: Character;
  resolveCharacter: (identifier: string) => CharacterResolution;
}

export const resolveSpeaker = ({
  nickname,
  defaultInGame,
  parsedInGame,
  asTarget,
  editingAttribution,
  channelCharacterId,
  channelCharacterName,
  channelCharacter,
  resolveCharacter,
}: ResolveSpeakerOptions): ResolvedSpeaker => {
  if (editingAttribution != null) {
    return {
      type: 'Resolved',
      source: 'Editing',
      name: editingAttribution.name,
      inGame: editingAttribution.inGame,
      characterId: editingAttribution.characterId,
      color: editingAttribution.color,
      portraitId: editingAttribution.portraitId,
    };
  }
  const inGame = asTarget != null ? true : (parsedInGame ?? defaultInGame);
  if (!inGame) {
    return {
      type: 'Resolved',
      source: 'User',
      name: nickname,
      inGame: false,
      characterId: null,
    };
  }
  if (asTarget?.type === 'TemporaryName') {
    return {
      type: 'Resolved',
      source: 'TemporaryName',
      name: asTarget.name,
      inGame: true,
      characterId: null,
    };
  }
  if (asTarget?.type === 'CharacterReference') {
    const resolution = resolveCharacter(asTarget.identifier);
    if (resolution.status !== 'Found') {
      return {
        type: 'InvalidCharacterReference',
        identifier: asTarget.identifier,
        reason: resolution.status,
      };
    }
    return {
      type: 'Resolved',
      source: 'Character',
      name: resolution.character.name,
      inGame: true,
      characterId: resolution.character.id,
      color: resolution.character.color,
      character: resolution.character,
    };
  }
  if (channelCharacterId != null) {
    return {
      type: 'Resolved',
      source: 'Character',
      name: channelCharacter?.name ?? channelCharacterName,
      inGame: true,
      characterId: channelCharacterId,
      color: channelCharacter?.color,
      character: channelCharacter,
    };
  }
  return {
    type: 'Resolved',
    source: 'TemporaryName',
    name: channelCharacterName,
    inGame: true,
    characterId: null,
  };
};
