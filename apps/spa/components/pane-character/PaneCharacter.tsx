import type { Character } from '@boluo/api';
import { post, put } from '@boluo/api-browser';
import { computeColors, parseGameColor } from '@boluo/color';
import { useQueryCharacter } from '@boluo/hooks/useQueryCharacter';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { useQueryEntriesByComponent } from '@boluo/hooks/useQueryEntriesByComponent';
import Archive from '@boluo/icons/Archive';
import Edit from '@boluo/icons/Edit';
import HatGlasses from '@boluo/icons/HatGlasses';
import { classifyLightOrDark } from '@boluo/theme';
import { Failed } from '@boluo/ui/Failed';
import { Loading } from '@boluo/ui/Loading';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { unwrap } from '@boluo/utils/result';
import { useState, type CSSProperties, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { CharacterEditForm, type CharacterEditDraft } from './CharacterEditForm';
import { CharacterEntryList } from './CharacterEntryList';
import { CharacterUsageList } from './CharacterUsageList';
import { COUNTER_COMPONENT_TYPE } from './entry-components';

interface Props {
  spaceId: string;
  characterId: string;
}

const errorMessage = (cause: unknown): string => {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'object' && cause != null) {
    if ('message' in cause && typeof cause.message === 'string') return cause.message;
    if ('code' in cause) return String(cause.code);
  }
  return 'Failed to update character';
};

const ArchivedStatus: FC = () => (
  <div className="text-text-muted flex items-center gap-1 text-sm font-medium">
    <Archive className="h-4 w-4" />
    <FormattedMessage defaultMessage="Archived" />
  </div>
);

const PaneCharacter: FC<Props> = ({ spaceId, characterId }) => {
  const {
    data: character,
    error: characterError,
    isLoading: characterLoading,
  } = useQueryCharacter(spaceId, characterId);
  const {
    data: counterEntries,
    error: entriesError,
    isLoading: entriesLoading,
  } = useQueryEntriesByComponent(spaceId, character?.scopeId, COUNTER_COMPONENT_TYPE);
  const { data: currentUser } = useQueryCurrentUser();
  const { mutate } = useSWRConfig();
  const lightOrDark = classifyLightOrDark(useResolvedTheme());
  const [isEditing, setIsEditing] = useState(false);

  if (characterLoading || character == null) {
    return (
      <PaneBox
        header={
          <PaneHeaderBox icon={<HatGlasses />}>
            <FormattedMessage defaultMessage="Character" />
          </PaneHeaderBox>
        }
      >
        {characterError ? (
          <div className="p-pane">
            <Failed
              code={characterError.code}
              title={<FormattedMessage defaultMessage="Failed to query character" />}
            />
          </div>
        ) : (
          <Loading />
        )}
      </PaneBox>
    );
  }

  const characterDisplayColor =
    character.color === ''
      ? currentUser == null
        ? undefined
        : computeColors(currentUser.id, parseGameColor(currentUser.defaultColor))[lightOrDark]
      : computeColors(character.id, parseGameColor(character.color))[lightOrDark];

  const updateCharacterCaches = async (updatedCharacter: Character) => {
    await mutate(['/characters/query', spaceId, character.id], updatedCharacter, false);
    await Promise.all([
      mutate(['/characters/by_space', spaceId, false, false]),
      mutate(['/characters/by_space', spaceId, false, true]),
      mutate(['/characters/by_space', spaceId, true, false]),
      mutate(['/characters/by_space', spaceId, true, true]),
      mutate(['/characters/usages', spaceId, character.id]),
    ]);
  };

  const saveCharacter = async (draft: CharacterEditDraft) => {
    try {
      const updated = await put('/characters/edit', null, {
        spaceId,
        characterId: character.id,
        expectedVersion: draft.expectedVersion,
        expectedScopeVersion: draft.expectedScopeVersion,
        name: draft.name,
        key: character.key,
        aliases: character.aliases,
        description: draft.description,
        color: draft.color,
        accessPolicy: character.accessPolicy,
        accessChannelId: character.accessChannelId,
        tags: character.tags,
      }).then(unwrap);
      await updateCharacterCaches(updated).catch(() => undefined);
    } catch (cause) {
      throw new Error(errorMessage(cause), { cause });
    }
  };

  const setCharacterArchived = async (archived: boolean) => {
    try {
      const updated = await post(archived ? '/characters/archive' : '/characters/restore', null, {
        spaceId,
        characterId: character.id,
        expectedVersion: character.version,
      }).then(unwrap);
      await updateCharacterCaches(updated).catch(() => undefined);
    } catch (cause) {
      throw new Error(errorMessage(cause), { cause });
    }
  };

  const operators = (
    <PaneHeaderButton
      active={isEditing}
      onClick={() => setIsEditing((editing) => !editing)}
      title="Edit character"
    >
      <Edit />
      <span className="hidden text-xs @md:inline">
        <FormattedMessage defaultMessage="Edit" />
      </span>
    </PaneHeaderButton>
  );

  return (
    <PaneBox
      initSizeLevel={1}
      header={
        <PaneHeaderBox operators={operators} icon={isEditing ? <Edit /> : <HatGlasses />}>
          {character.name}
        </PaneHeaderBox>
      }
    >
      <div className="space-y-3">
        {isEditing ? (
          <CharacterEditForm
            character={character}
            fallbackColor={currentUser?.defaultColor}
            fallbackColorSeed={currentUser?.id}
            onCancel={() => setIsEditing(false)}
            onSave={saveCharacter}
            onSetArchived={setCharacterArchived}
          />
        ) : (
          <div className="p-pane space-y-3">
            <div className="space-y-3">
              {character.archivedAt != null && <ArchivedStatus />}
              <h2
                className="stroke-name text-xl font-bold"
                style={
                  characterDisplayColor == null
                    ? undefined
                    : ({
                        color: characterDisplayColor,
                        '--name-color': characterDisplayColor,
                      } as CSSProperties)
                }
              >
                {character.name}
              </h2>
              {character.description !== '' ? (
                <div className="text-text-secondary whitespace-pre-line">
                  {character.description}
                </div>
              ) : (
                <div className="text-text-muted text-sm">
                  <FormattedMessage defaultMessage="No description yet." />
                </div>
              )}
            </div>
          </div>
        )}
        <CharacterUsageList spaceId={spaceId} characterId={character.id} />
        <CharacterEntryList
          entries={counterEntries}
          isLoading={entriesLoading}
          errorCode={entriesError?.code}
        />
      </div>
    </PaneBox>
  );
};

export default PaneCharacter;
