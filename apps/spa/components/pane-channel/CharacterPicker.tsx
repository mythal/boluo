import type { ApiError, Character, MemberWithUser } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { computeColors, parseGameColor } from '@boluo/color';
import { classifyLightOrDark } from '@boluo/theme';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { unwrap } from '@boluo/utils/result';
import { useAtomValue, useSetAtom } from 'jotai';
import { Fragment, type FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useToggleCharacterPane } from '../../hooks/useToggleCharacterPane';
import { CharacterSelectorItem } from './CharacterSelectorItem';
import { InlineCharacterCreate } from './InlineCharacterCreate';
import { recentCharacterIdsAtomFamily } from './recentCharacters';
import {
  createCharacterDirectory,
  getShortestCharacterIdentifier,
  resolveCharacterIdentifier,
} from '../../characters/directory';

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
    .toLowerCase()
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
  const lightOrDark = classifyLightOrDark(useResolvedTheme());
  const { mutate } = useSWRConfig();
  const { isCharacterPaneOpen, toggleCharacterDetails } = useToggleCharacterPane(spaceId);
  const { composeAtom, asTargetAtom, asTargetTextAtom } = useChannelAtoms();
  const asTarget = useAtomValue(asTargetAtom);
  const existingName = useAtomValue(asTargetTextAtom).trim();
  const defaultName = member.channel.characterName;
  const suggestedName =
    existingName ||
    (suggestionCharacters?.some((character) => character.name === defaultName) ? '' : defaultName);
  const dispatch = useSetAtom(composeAtom);
  const recordCharacterUse = useSetAtom(recentCharacterIdsAtomFamily({ spaceId, userId }));
  const characterDirectory = useMemo(
    () => (suggestionCharacters ? createCharacterDirectory(suggestionCharacters) : null),
    [suggestionCharacters],
  );
  const selectedReference =
    asTarget?.type === 'CharacterReference' && characterDirectory != null
      ? resolveCharacterIdentifier(asTarget.identifier, characterDirectory)
      : null;
  const selectedCharacterId =
    selectedReference?.id ??
    (asTarget == null || asTarget.type === 'DefaultCharacter' ? member.channel.characterId : null);
  const charactersWithDefaultFirst = useMemo(() => {
    if (characters == null || member.channel.characterId == null) return characters;
    const defaultIndex = characters.findIndex(
      (character) => character.id === member.channel.characterId,
    );
    if (defaultIndex <= 0) return characters;
    const reordered = [...characters];
    const [defaultCharacter] = reordered.splice(defaultIndex, 1);
    if (defaultCharacter != null) reordered.unshift(defaultCharacter);
    return reordered;
  }, [characters, member.channel.characterId]);

  const selectCharacter = (character: Character) => {
    recordCharacterUse(character.id);
    dispatch({
      type: 'setAsTargetText',
      payload: {
        text:
          character.id === member.channel.characterId
            ? ''
            : `@${getShortestCharacterIdentifier(character)}`,
        setInGame: true,
      },
    });
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
    selectCharacter(character);
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
        {charactersWithDefaultFirst?.map((character) => {
          const isDefault = character.id === member.channel.characterId;
          return (
            <Fragment key={character.id}>
              <CharacterSelectorItem
                character={character}
                displayColor={
                  character.color === ''
                    ? undefined
                    : computeColors(character.id, parseGameColor(character.color))[lightOrDark]
                }
                current={selectedCharacterId === character.id}
                isDefault={isDefault}
                onSelect={selectCharacter}
                onToggleDetails={(selected) => toggleCharacterDetails(selected.id)}
                detailsOpen={isCharacterPaneOpen(character.id)}
                disabled={character.archivedAt != null}
              />
              {isDefault && charactersWithDefaultFirst.length > 1 && (
                <div className="border-border-default border-t" />
              )}
            </Fragment>
          );
        })}
      </div>
      <InlineCharacterCreate suggestedName={suggestedName} onCreate={createCharacter} />
    </div>
  );
};
