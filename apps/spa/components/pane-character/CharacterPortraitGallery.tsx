import type { EntryComponentMatch } from '@boluo/api';
import Edit from '@boluo/icons/Edit';
import { Button } from '@boluo/ui/Button';
import clsx from 'clsx';
import { type FC, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  CharacterPortrait,
  type CharacterPortraitSource,
  portraitSourceFromEntry,
} from './CharacterPortrait';
import { sortPortraitEntries } from './portrait';

interface Props {
  spaceId: string;
  characterName: string;
  portraitEntries: EntryComponentMatch[] | undefined;
  isLoading: boolean;
  failed: boolean;
  onEdit?: () => void;
  editButtonMode?: 'hover' | 'always';
}

export const CharacterPortraitGallery: FC<Props> = ({
  spaceId,
  characterName,
  portraitEntries,
  isLoading,
  failed,
  onEdit,
  editButtonMode = 'hover',
}) => {
  const intl = useIntl();
  const entries = useMemo(() => sortPortraitEntries(portraitEntries), [portraitEntries]);
  let mainSource: CharacterPortraitSource;
  if (isLoading) {
    mainSource = { type: 'LOADING' };
  } else if (failed) {
    mainSource = { type: 'ERROR' };
  } else {
    const mainEntry = entries[0];
    mainSource = mainEntry == null ? { type: 'NONE' } : portraitSourceFromEntry(mainEntry);
  }

  return (
    <div
      className="group/portrait-gallery flex w-full min-w-0 items-end gap-3 overflow-x-auto pb-1"
      role="group"
      aria-label={intl.formatMessage({ defaultMessage: 'Portrait gallery' })}
    >
      <div className="relative">
        <CharacterPortrait spaceId={spaceId} characterName={characterName} source={mainSource} />
        {onEdit != null && (
          <Button
            small
            onClick={onEdit}
            className={clsx(
              'absolute top-2 left-2 z-10 shadow-sm transition-opacity',
              editButtonMode === 'hover' &&
                'opacity-0 group-focus-within/portrait-gallery:opacity-100 group-hover/portrait-gallery:opacity-100 focus-visible:opacity-100',
            )}
            aria-label={intl.formatMessage({ defaultMessage: 'Edit portraits' })}
            title={intl.formatMessage({ defaultMessage: 'Edit portraits' })}
          >
            <Edit />
            <FormattedMessage defaultMessage="Edit portraits" />
          </Button>
        )}
      </div>
      {entries.slice(1).map((entry) => {
        return (
          <CharacterPortrait
            key={entry.id}
            spaceId={spaceId}
            characterName={characterName}
            source={portraitSourceFromEntry(entry)}
            size="gallery"
            loading="lazy"
          />
        );
      })}
    </div>
  );
};
