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

export interface Speaker {
  source: 'User' | 'TemporaryName' | 'Character' | 'Editing';
  name: string;
  inGame: boolean;
  characterId: string | null;
  color?: string;
  portraitId?: string | null;
  character?: Character;
}

export interface SpeakerIssue {
  type: 'CharacterReferenceUnavailable';
  identifier: string;
  reason: Exclude<CharacterResolution['status'], 'Found'>;
}

export interface SpeakerResolution {
  speaker: Speaker;
  issue: SpeakerIssue | null;
}

interface ResolveSpeakerModeOptions {
  defaultInGame: boolean;
  parsedInGame: boolean | null;
  asTarget: AsTarget | null;
  originalMessageAttribution?: Pick<SpeakerAttribution, 'inGame'>;
}

export const resolveSpeakerMode = ({
  defaultInGame,
  parsedInGame,
  asTarget,
  originalMessageAttribution,
}: ResolveSpeakerModeOptions): {
  inGame: boolean;
  usesOriginalMessageAttribution: boolean;
} => {
  const usesOriginalMessageAttribution =
    originalMessageAttribution != null &&
    asTarget == null &&
    (parsedInGame == null || parsedInGame === originalMessageAttribution.inGame);
  const inGame =
    asTarget != null ? true : (parsedInGame ?? originalMessageAttribution?.inGame ?? defaultInGame);
  return { inGame, usesOriginalMessageAttribution };
};

interface ResolveSpeakerOptions {
  nickname: string;
  defaultInGame: boolean;
  parsedInGame: boolean | null;
  asTarget: AsTarget | null;
  originalMessageAttribution?: SpeakerAttribution;
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
  originalMessageAttribution,
  channelCharacterId,
  channelCharacterName,
  channelCharacter,
  resolveCharacter,
}: ResolveSpeakerOptions): SpeakerResolution => {
  const { inGame, usesOriginalMessageAttribution } = resolveSpeakerMode({
    defaultInGame,
    parsedInGame,
    asTarget,
    originalMessageAttribution,
  });
  if (usesOriginalMessageAttribution && originalMessageAttribution != null) {
    return {
      speaker: {
        source: 'Editing',
        name: originalMessageAttribution.name,
        inGame,
        characterId: originalMessageAttribution.characterId,
        color: originalMessageAttribution.color,
        portraitId: originalMessageAttribution.portraitId,
      },
      issue: null,
    };
  }
  if (!inGame) {
    return {
      speaker: {
        source: 'User',
        name: nickname,
        inGame: false,
        characterId: null,
      },
      issue: null,
    };
  }
  if (asTarget?.type === 'TemporaryName') {
    return {
      speaker: {
        source: 'TemporaryName',
        name: asTarget.name,
        inGame: true,
        characterId: null,
      },
      issue: null,
    };
  }
  let issue: SpeakerIssue | null = null;
  if (asTarget?.type === 'CharacterReference') {
    const resolution = resolveCharacter(asTarget.identifier);
    if (resolution.status !== 'Found') {
      issue = {
        type: 'CharacterReferenceUnavailable',
        identifier: asTarget.identifier,
        reason: resolution.status,
      };
    } else {
      return {
        speaker: {
          source: 'Character',
          name: resolution.character.name,
          inGame: true,
          characterId: resolution.character.id,
          color: resolution.character.color,
          character: resolution.character,
        },
        issue: null,
      };
    }
  }
  if (channelCharacterId != null) {
    return {
      speaker: {
        source: 'Character',
        name: channelCharacter?.name ?? channelCharacterName,
        inGame: true,
        characterId: channelCharacterId,
        color: channelCharacter?.color,
        character: channelCharacter,
      },
      issue,
    };
  }
  return {
    speaker: {
      source: 'TemporaryName',
      name: channelCharacterName,
      inGame: true,
      characterId: null,
    },
    issue,
  };
};
