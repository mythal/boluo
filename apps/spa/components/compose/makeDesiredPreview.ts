import { type PreviewPost } from '@boluo/api';
import { equalPreviewEdit, isClearedPreviewContent } from '@boluo/api/preview/diff';
import { type DesiredPreview } from '@boluo/api/preview/publisher';
import { type ComposeParseResult } from '../../hooks/useChannelAtoms';
import { type ComposeState } from '../../state/compose.reducer';
import { resolveSpeaker, type CharacterResolution } from '../../characters/resolveSpeaker';

export type ComposePreviewMetadata = Pick<ComposeState, 'previewId' | 'edit'>;

export const selectComposePreviewMetadata = ({
  previewId,
  edit,
}: ComposeState): ComposePreviewMetadata => ({ previewId, edit });

export const areComposePreviewMetadataEqual = (
  left: ComposePreviewMetadata,
  right: ComposePreviewMetadata,
): boolean => left.previewId === right.previewId && equalPreviewEdit(left.edit, right.edit);

interface MakeDesiredPreviewOptions {
  channelId: string;
  nickname: string;
  defaultCharacterName: string;
  defaultInGame: boolean;
  compose: ComposeState;
  parsed: ComposeParseResult;
  resolveCharacter?: (identifier: string) => CharacterResolution;
}

export const makeDesiredPreview = ({
  channelId,
  nickname,
  defaultCharacterName,
  defaultInGame,
  compose,
  parsed,
  resolveCharacter = () => ({ status: 'NotFound' }),
}: MakeDesiredPreviewOptions): DesiredPreview | null => {
  if (parsed.source !== compose.source) return null;

  const { previewId, edit } = compose;
  const { isAction, broadcast, whisperToUsernames } = parsed;
  const { speaker } = resolveSpeaker({
    nickname,
    defaultInGame,
    parsedInGame: parsed.inGame,
    asTarget: parsed.asTarget,
    originalMessageAttribution: compose.originalMessageAttribution,
    channelCharacterId: null,
    channelCharacterName: defaultCharacterName,
    resolveCharacter,
  });
  const shouldHideContent = !broadcast || whisperToUsernames != null;
  const clearedPreview = isClearedPreviewContent(parsed);
  const text: string | null = clearedPreview ? '' : shouldHideContent ? null : parsed.text;
  const entities = clearedPreview || shouldHideContent ? [] : parsed.entities;
  const preview: PreviewPost = {
    id: previewId,
    channelId,
    name: speaker.name,
    mediaId: null,
    inGame: speaker.inGame,
    isAction,
    text,
    clear: false,
    entities,
    editFor: null,
    edit,
  };
  return { preview };
};
