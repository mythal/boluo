import { type PreviewPost } from '@boluo/api';
import { equalPreviewEdit, isClearedPreviewContent } from '@boluo/api/preview/diff';
import { type DesiredPreview } from '@boluo/api/preview/publisher';
import { type ComposeParseResult } from '../../hooks/useChannelAtoms';
import { type ComposeState } from '../../state/compose.reducer';

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
}

export const makeDesiredPreview = ({
  channelId,
  nickname,
  defaultCharacterName,
  defaultInGame,
  compose,
  parsed,
}: MakeDesiredPreviewOptions): DesiredPreview | null => {
  if (parsed.source !== compose.source) return null;

  const { previewId, edit } = compose;
  const {
    isAction,
    broadcast,
    whisperToUsernames,
    inGame: parsedInGame,
    characterName: parsedCharacterName,
  } = parsed;
  const inGame = parsedCharacterName ? true : (parsedInGame ?? defaultInGame);
  const inGameName = parsedCharacterName || defaultCharacterName;
  const shouldHideContent = !broadcast || whisperToUsernames != null;
  const clearedPreview = isClearedPreviewContent(parsed);
  const text: string | null = clearedPreview ? '' : shouldHideContent ? null : parsed.text;
  const entities = clearedPreview || shouldHideContent ? [] : parsed.entities;
  const preview: PreviewPost = {
    id: previewId,
    channelId,
    name: inGame ? inGameName : nickname,
    mediaId: null,
    inGame,
    isAction,
    text,
    clear: false,
    entities,
    editFor: null,
    edit,
  };
  return { preview };
};
