import type { Character } from '@boluo/api';
import Archive from '@boluo/icons/Archive';
import HatGlasses from '@boluo/icons/HatGlasses';
import { Button } from '@boluo/ui/Button';
import clsx from 'clsx';
import type { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

interface Props {
  character: Character;
  current: boolean;
  isDefault: boolean;
  displayColor?: string;
  onSelect: (character: Character) => void;
  onToggleDetails: (character: Character) => void;
  detailsOpen: boolean;
  disabled: boolean;
}

export const CharacterSelectorItem: FC<Props> = ({
  character,
  current,
  isDefault,
  displayColor,
  onSelect,
  onToggleDetails,
  detailsOpen,
  disabled,
}) => {
  const intl = useIntl();
  const archived = character.archivedAt != null;
  return (
    <div className="flex items-center gap-1">
      <Button
        small
        on={current}
        active={current}
        disabled={disabled}
        onClick={() => onSelect(character)}
        className="min-w-0 grow justify-start"
        style={displayColor ? { borderColor: displayColor } : undefined}
      >
        <span className="min-w-0 truncate text-left" title={character.name}>
          {character.name}
        </span>
        {isDefault && (
          <span
            className={clsx(
              'inline-flex shrink-0 rounded border px-1 py-0.5 text-xs leading-none',
              current
                ? 'border-border-strong bg-surface-unit/70'
                : 'border-border-default bg-surface-canvas',
            )}
            title={intl.formatMessage({ defaultMessage: 'Default character' })}
          >
            <FormattedMessage defaultMessage="Default" />
          </span>
        )}
        {archived && (
          <span
            className="text-text-muted ml-auto inline-flex shrink-0 items-center"
            title={intl.formatMessage({ defaultMessage: 'Archived' })}
          >
            <Archive />
            <span className="sr-only">
              <FormattedMessage defaultMessage="Archived" />
            </span>
          </span>
        )}
        {current && (
          <span
            className={
              archived
                ? 'inline-flex shrink-0 items-center'
                : 'ml-auto inline-flex shrink-0 items-center'
            }
          >
            <span
              aria-hidden
              className="bg-action-toggle-indicator-on shadow-action-toggle-indicator-on/20 inline-block h-2 w-2 rounded-full shadow-[0_0_0_1px]"
            />
            <span className="sr-only">
              <FormattedMessage defaultMessage="Current character" />
            </span>
          </span>
        )}
      </Button>
      <Button
        small
        on={detailsOpen}
        active={detailsOpen}
        aria-label={intl.formatMessage({ defaultMessage: 'Toggle character details' })}
        onClick={() => onToggleDetails(character)}
        className="shrink-0 px-2"
      >
        <HatGlasses />
      </Button>
    </div>
  );
};
