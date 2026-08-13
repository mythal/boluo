import { useQueryCharacter } from '@boluo/hooks/useQueryCharacter';
import { useQueryEntriesByComponent } from '@boluo/hooks/useQueryEntriesByComponent';
import clsx from 'clsx';
import { useAtomValue, useSetAtom } from 'jotai';
import { type CSSProperties, type FC, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { shouldClearCharacterPortraitSelection } from '../../state/characterPortraitSelection';
import { CharacterPortrait, portraitSourceFromEntry } from '../pane-character/CharacterPortrait';
import {
  parsePortraitComponent,
  PORTRAIT_COMPONENT_TYPE,
  sortPortraitEntries,
} from '../pane-character/portrait';

interface Props {
  spaceId: string;
  characterId: string | null;
}

const PORTRAIT_PICKER_GAP_REM = 0.5;

export const SelectedCharacterPortraitPreview: FC<Props> = ({ spaceId, characterId }) => {
  const intl = useIntl();
  const { composeAtom, characterNameAtom } = useChannelAtoms();
  const characterName = useAtomValue(characterNameAtom);
  const selectedCharacterPortrait = useAtomValue(composeAtom).selectedCharacterPortrait;
  const dispatch = useSetAtom(composeAtom);
  const [expanded, setExpanded] = useState(false);
  const { data: character } = useQueryCharacter(spaceId, characterId ?? undefined);
  const { data: portraitEntries } = useQueryEntriesByComponent(
    spaceId,
    character?.scopeId,
    PORTRAIT_COMPONENT_TYPE,
  );
  const portraits = useMemo(() => sortPortraitEntries(portraitEntries), [portraitEntries]);
  const selectedPortrait =
    portraits.find(
      (entry) =>
        selectedCharacterPortrait?.characterId === characterId &&
        parsePortraitComponent(entry.component)?.assetId === selectedCharacterPortrait.portraitId,
    ) ?? portraits[0];

  useEffect(() => {
    const availablePortraitIds = portraits.flatMap((entry) => {
      const portrait = parsePortraitComponent(entry.component);
      return portrait == null ? [] : [portrait.assetId];
    });
    if (
      portraitEntries != null &&
      shouldClearCharacterPortraitSelection(
        characterId,
        selectedCharacterPortrait,
        availablePortraitIds,
      )
    ) {
      dispatch({ type: 'selectCharacterPortrait', payload: null });
    }
  }, [characterId, dispatch, portraitEntries, portraits, selectedCharacterPortrait]);

  if (characterName.trim() !== '' || character == null || selectedPortrait == null) return null;

  const portraitOptions = portraits.filter((portrait) => portrait.id !== selectedPortrait.id);
  const multiple = portraitOptions.length > 0;

  return (
    <div className="absolute -top-6 -right-6 z-10">
      {multiple && (
        <div
          aria-hidden={!expanded}
          className={clsx('absolute top-0 left-full flex', !expanded && 'pointer-events-none')}
          style={
            {
              gap: `${PORTRAIT_PICKER_GAP_REM}rem`,
              marginLeft: `${PORTRAIT_PICKER_GAP_REM}rem`,
            } satisfies CSSProperties
          }
        >
          {portraitOptions.map((portrait, index) => {
            const portraitId = parsePortraitComponent(portrait.component)?.assetId;
            if (portraitId == null) return null;
            return (
              <button
                key={portrait.id}
                type="button"
                tabIndex={expanded ? 0 : -1}
                aria-label={intl.formatMessage(
                  { defaultMessage: 'Use portrait {number}' },
                  { number: index + 1 },
                )}
                onClick={() => {
                  dispatch({
                    type: 'selectCharacterPortrait',
                    payload: { characterId: character.id, portraitId },
                  });
                  setExpanded(false);
                }}
                className={clsx(
                  'focus-visible:ring-border-focus shrink-0 cursor-pointer rounded-md shadow-sm transition-[opacity,transform] duration-300 ease-in-out focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none',
                  expanded ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
                )}
                style={{
                  transform: expanded
                    ? undefined
                    : `translateX(calc(-${(index + 1) * 100}% - ${(index + 1) * PORTRAIT_PICKER_GAP_REM}rem)) scale(0.95)`,
                }}
              >
                <CharacterPortrait
                  spaceId={spaceId}
                  characterName={character.name}
                  source={portraitSourceFromEntry(portrait)}
                  size="popover"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        disabled={!multiple}
        aria-expanded={multiple ? expanded : undefined}
        aria-label={intl.formatMessage({ defaultMessage: 'Choose character portrait' })}
        onClick={() => setExpanded((value) => !value)}
        className={clsx(
          'block rounded-md shadow-sm focus-visible:outline-none',
          multiple && 'focus-visible:ring-border-focus cursor-pointer focus-visible:ring-2',
        )}
      >
        <CharacterPortrait
          spaceId={spaceId}
          characterName={character.name}
          source={portraitSourceFromEntry(selectedPortrait)}
          size="popover"
        />
      </button>
    </div>
  );
};
