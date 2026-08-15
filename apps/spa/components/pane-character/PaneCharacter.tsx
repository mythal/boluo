import { computeColors, parseGameColor } from '@boluo/color';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { useQueryCharacter } from '@boluo/hooks/useQueryCharacter';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { useQueryEntriesByComponent } from '@boluo/hooks/useQueryEntriesByComponent';
import Archive from '@boluo/icons/Archive';
import ChevronLeft from '@boluo/icons/ChevronLeft';
import Edit from '@boluo/icons/Edit';
import HatGlasses from '@boluo/icons/HatGlasses';
import { classifyLightOrDark } from '@boluo/theme';
import { Badge } from '@boluo/ui/Badge';
import { Failed } from '@boluo/ui/Failed';
import { Loading } from '@boluo/ui/Loading';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { TooltipBox } from '@boluo/ui/TooltipBox';
import { useCopyText } from '@boluo/ui/hooks/useCopyText';
import { useFloatingSetters } from '@boluo/ui/hooks/useFloatingSetters';
import { useState, type FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { getNameStrokeStyle } from '@boluo/ui/chat/NameBox';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { CharacterEditForm } from './CharacterEditForm';
import { CharacterEntryList } from './CharacterEntryList';
import { CharacterPortraitEditor } from './CharacterPortraitEditor';
import { CharacterPortraitGallery } from './CharacterPortraitGallery';
import { CharacterUsageList } from './CharacterUsageList';
import { useCanEditCharacter } from './character-permissions';
import { CharacterAccessSummary } from './CharacterAccessFields';
import { CharacterArchiveButton } from './CharacterArchiveButton';
import { useCharacterMutations } from './useCharacterMutations';
import { COUNTER_COMPONENT_TYPE } from './entry-components';
import { PORTRAIT_COMPONENT_TYPE } from './portrait';

interface Props {
  spaceId: string;
  characterId: string;
}

type CharacterPaneState =
  | { type: 'VIEW' }
  | { type: 'EDIT_CHARACTER' }
  | { type: 'EDIT_PORTRAITS'; returnTo: 'VIEW' | 'EDIT_CHARACTER' };

const ArchivedStatus: FC = () => (
  <div className="text-text-muted flex items-center gap-1 text-xs font-medium">
    <Archive className="h-4 w-4" />
    <FormattedMessage defaultMessage="Archived" />
  </div>
);

const CharacterAliasBadge: FC<{ alias: string }> = ({ alias }) => {
  const intl = useIntl();
  const { copied: showCopied, copy } = useCopyText();
  const { refs, floatingStyles } = useFloating({
    open: showCopied,
    placement: 'top',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const { setReference, setFloating } = useFloatingSetters(refs);

  return (
    <>
      <Badge
        ref={setReference}
        title={intl.formatMessage({ defaultMessage: 'Click to copy' })}
        aria-label={intl.formatMessage({ defaultMessage: 'Copy alias {alias}' }, { alias })}
        onClick={() => void copy(alias)}
      >
        {alias}
      </Badge>
      <TooltipBox defaultStyle show={showCopied} ref={setFloating} style={floatingStyles}>
        <FormattedMessage defaultMessage="Copied" />
      </TooltipBox>
    </>
  );
};

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
  const {
    data: portraitEntries,
    error: portraitEntriesError,
    isLoading: portraitEntriesLoading,
  } = useQueryEntriesByComponent(spaceId, character?.scopeId, PORTRAIT_COMPONENT_TYPE);
  const { data: currentUser } = useQueryCurrentUser();
  const canEditCharacter = useCanEditCharacter(character);
  const { editCharacter, setArchived } = useCharacterMutations(character);
  const resolvedTheme = useResolvedTheme();
  const lightOrDark = classifyLightOrDark(resolvedTheme);
  const [paneState, setPaneState] = useState<CharacterPaneState>({ type: 'VIEW' });

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
  const openPortraitEditor = (returnTo: 'VIEW' | 'EDIT_CHARACTER') =>
    setPaneState({ type: 'EDIT_PORTRAITS', returnTo });
  const operators =
    paneState.type === 'EDIT_PORTRAITS' ? (
      <PaneHeaderButton onClick={() => setPaneState({ type: paneState.returnTo })} title="Back">
        <ChevronLeft />
        <span className="hidden text-xs @md:inline">
          <FormattedMessage defaultMessage="Back" />
        </span>
      </PaneHeaderButton>
    ) : canEditCharacter ? (
      <>
        <CharacterArchiveButton
          character={character}
          onSetArchived={async (archived) => {
            await setArchived(archived);
            setPaneState({ type: 'VIEW' });
          }}
        />
        <PaneHeaderButton
          active={paneState.type === 'EDIT_CHARACTER'}
          onClick={() =>
            setPaneState((current) => ({
              type: current.type === 'VIEW' ? 'EDIT_CHARACTER' : 'VIEW',
            }))
          }
          title="Edit character"
        >
          <Edit />
          <span className="hidden text-xs @md:inline">
            <FormattedMessage defaultMessage="Edit" />
          </span>
        </PaneHeaderButton>
      </>
    ) : null;

  return (
    <PaneBox
      initSizeLevel={1}
      header={
        <PaneHeaderBox
          operators={operators}
          icon={paneState.type === 'VIEW' ? <HatGlasses /> : <Edit />}
        >
          {character.name}
        </PaneHeaderBox>
      }
    >
      <div className="space-y-3">
        {paneState.type !== 'VIEW' ? (
          <>
            {paneState.type === 'EDIT_PORTRAITS' && (
              <CharacterPortraitEditor
                spaceId={spaceId}
                scopeId={character.scopeId}
                characterName={character.name}
                portraitEntries={portraitEntries}
                portraitQueryFailed={portraitEntriesError != null}
                portraitQueryLoading={portraitEntriesLoading}
              />
            )}
            {(paneState.type === 'EDIT_CHARACTER' ||
              (paneState.type === 'EDIT_PORTRAITS' && paneState.returnTo === 'EDIT_CHARACTER')) && (
              <div className={paneState.type === 'EDIT_PORTRAITS' ? 'hidden' : undefined}>
                <section className="p-pane border-border-subtle border-b">
                  <h3 className="text-text-secondary mb-2 text-sm">
                    <FormattedMessage defaultMessage="Portraits" />
                  </h3>
                  <CharacterPortraitGallery
                    spaceId={spaceId}
                    characterName={character.name}
                    portraitEntries={portraitEntries}
                    isLoading={portraitEntriesLoading}
                    failed={portraitEntriesError != null}
                    onEdit={() => openPortraitEditor('EDIT_CHARACTER')}
                    editButtonMode="always"
                  />
                </section>
                <CharacterEditForm
                  character={character}
                  fallbackColor={currentUser?.defaultColor}
                  fallbackColorSeed={currentUser?.id}
                  onCancel={() => setPaneState({ type: 'VIEW' })}
                  onSave={editCharacter}
                />
              </div>
            )}
          </>
        ) : (
          <div className="p-pane space-y-4">
            <CharacterPortraitGallery
              spaceId={spaceId}
              characterName={character.name}
              portraitEntries={portraitEntries}
              isLoading={portraitEntriesLoading}
              failed={portraitEntriesError != null}
              onEdit={canEditCharacter ? () => openPortraitEditor('VIEW') : undefined}
            />
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {character.archivedAt != null && <ArchivedStatus />}
                <CharacterAccessSummary
                  spaceId={spaceId}
                  accessPolicy={character.accessPolicy}
                  accessChannelId={character.accessChannelId}
                />
              </div>
              <h2
                className="stroke-name text-xl font-bold"
                style={
                  characterDisplayColor == null
                    ? undefined
                    : {
                        color: characterDisplayColor,
                        ...getNameStrokeStyle(characterDisplayColor, resolvedTheme, {
                          type: 'pane',
                        }),
                      }
                }
              >
                {character.name}
              </h2>
              {character.aliases.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-text-secondary mr-1 text-sm">
                    <FormattedMessage defaultMessage="Aliases" />
                  </span>
                  {character.aliases.map((alias) => (
                    <CharacterAliasBadge key={alias} alias={alias} />
                  ))}
                </div>
              )}
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
        {paneState.type !== 'EDIT_PORTRAITS' && (
          <>
            <CharacterUsageList spaceId={spaceId} characterId={character.id} />
            <CharacterEntryList
              entries={counterEntries}
              isLoading={entriesLoading}
              errorCode={entriesError?.code}
            />
          </>
        )}
      </div>
    </PaneBox>
  );
};

export default PaneCharacter;
