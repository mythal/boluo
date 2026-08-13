import type { ApiError, Character, MemberWithUser } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { computeColors, parseGameColor } from '@boluo/color';
import { classifyLightOrDark } from '@boluo/theme';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { unwrap } from '@boluo/utils/result';
import { useAtomValue, useSetAtom } from 'jotai';
import { useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useToggleCharacterPane } from '../../hooks/useToggleCharacterPane';
import { CharacterSelectorItem } from './CharacterSelectorItem';
import { InlineCharacterCreate } from './InlineCharacterCreate';
import { recentCharacterIdsAtomFamily } from './recentCharacters';

interface Props {
  member: MemberWithUser;
  characters: Character[] | undefined;
  suggestionCharacters?: Character[];
  error: ApiError | undefined;
  isLoading: boolean;
  variant?: 'recent' | 'all';
  onViewAll?: () => void;
}

const makeKey = (name: string): string => {
  const key = name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  return key || 'character';
};

export const CharacterPicker: FC<Props> = ({
  member,
  characters,
  suggestionCharacters = characters,
  error,
  isLoading,
  variant = 'recent',
  onViewAll,
}) => {
  const spaceId = member.space.spaceId;
  const userId = member.user.id;
  const channelId = member.channel.channelId;
  const lightOrDark = classifyLightOrDark(useResolvedTheme());
  const { trigger: bindCharacter, isMutating: isBinding } = useEditChannelCharacterName(channelId);
  const { mutate } = useSWRConfig();
  const { isCharacterPaneOpen, toggleCharacterDetails } = useToggleCharacterPane(spaceId);
  const { composeAtom, characterNameAtom } = useChannelAtoms();
  const existingName = useAtomValue(characterNameAtom).trim();
  const defaultName = member.channel.characterName;
  const suggestedName =
    existingName ||
    (suggestionCharacters?.some((character) => character.name === defaultName) ? '' : defaultName);
  const dispatch = useSetAtom(composeAtom);
  const recordCharacterUse = useSetAtom(recentCharacterIdsAtomFamily({ spaceId, userId }));
  const [bindError, setBindError] = useState<string | null>(null);

  const selectCharacter = async (character: Character) => {
    setBindError(null);
    try {
      await bindCharacter({ characterId: character.id, characterName: character.name });
      recordCharacterUse(character.id);
      await mutate(['/channels/members', channelId]);
      dispatch({ type: 'setCharacterName', payload: { name: '', setInGame: true } });
    } catch (cause) {
      setBindError(cause instanceof Error ? cause.message : 'Failed to bind character');
    }
  };

  const createCharacter = async (name: string) => {
    const character = await post('/characters/create', null, {
      spaceId,
      name,
      key: makeKey(name),
      description: '',
      color: '',
      accessPolicy: 'PUBLIC',
      accessChannelId: null,
    }).then(unwrap);
    await Promise.all([
      mutate(['/characters/by_space', spaceId, false, false]),
      mutate(['/characters/by_space', spaceId, false, true]),
      mutate(['/characters/by_space', spaceId, true, false]),
      mutate(['/characters/by_space', spaceId, true, true]),
    ]);
    await selectCharacter(character);
  };

  return (
    <div
      className={
        variant === 'recent' ? 'border-border-default mt-2 space-y-2 border-t pt-2' : 'space-y-2'
      }
    >
      {variant === 'recent' && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm">
            <FormattedMessage defaultMessage="Recent characters" />
          </div>
          <ButtonInline onClick={onViewAll}>
            <FormattedMessage defaultMessage="View all" />
          </ButtonInline>
        </div>
      )}
      {isLoading && <div className="text-text-muted text-sm">…</div>}
      {error && (
        <div className="text-state-warning-text text-xs">
          <FormattedMessage defaultMessage="Characters could not be loaded." />
        </div>
      )}
      {!isLoading && !error && characters?.length === 0 && (
        <div className="text-text-muted text-sm">
          <FormattedMessage defaultMessage="No characters yet." />
        </div>
      )}
      <div className="space-y-1">
        {characters?.map((character) => (
          <CharacterSelectorItem
            key={character.id}
            character={character}
            displayColor={
              character.color === ''
                ? undefined
                : computeColors(character.id, parseGameColor(character.color))[lightOrDark]
            }
            current={member.channel.characterId === character.id && existingName === ''}
            onSelect={(selected) => void selectCharacter(selected)}
            onToggleDetails={(selected) => toggleCharacterDetails(selected.id)}
            detailsOpen={isCharacterPaneOpen(character.id)}
            disabled={isBinding || character.archivedAt != null}
          />
        ))}
      </div>
      <InlineCharacterCreate
        suggestedName={suggestedName}
        disabled={isBinding}
        onCreate={createCharacter}
      />
      {bindError && <div className="text-state-danger-text text-xs">{bindError}</div>}
    </div>
  );
};
