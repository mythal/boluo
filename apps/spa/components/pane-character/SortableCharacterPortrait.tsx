import type { EntryComponentMatch } from '@boluo/api';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { type FC } from 'react';
import { useIntl } from 'react-intl';
import { CharacterPortrait, type CharacterPortraitSource } from './CharacterPortrait';

interface Props {
  spaceId: string;
  characterName: string;
  entry: EntryComponentMatch;
  index: number;
  source: CharacterPortraitSource;
  selected: boolean;
  disabled: boolean;
  onSelect: (entryId: string) => void;
}

export const SortableCharacterPortrait: FC<Props> = ({
  spaceId,
  characterName,
  entry,
  index,
  source,
  selected,
  disabled,
  onSelect,
}) => {
  const intl = useIntl();
  const {
    attributes,
    listeners,
    isDragging,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: entry.id, disabled });
  const label =
    index === 0
      ? intl.formatMessage({ defaultMessage: 'Select and reorder main portrait' })
      : intl.formatMessage(
          { defaultMessage: 'Select and reorder portrait {number}' },
          { number: index + 1 },
        );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx(
        'relative shrink-0 rounded-md',
        selected && 'ring-border-focus ring-offset-surface-raised ring-2 ring-offset-2',
        isDragging && 'z-10 shadow-lg',
      )}
      onClick={() => onSelect(entry.id)}
      onFocus={() => onSelect(entry.id)}
    >
      <div
        ref={setActivatorNodeRef}
        className={clsx(
          'touch-none rounded-md focus-visible:outline-none',
          disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
        )}
        {...attributes}
        {...listeners}
        aria-label={label}
        aria-pressed={selected}
        title={label}
      >
        <CharacterPortrait
          spaceId={spaceId}
          characterName={characterName}
          source={source}
          size={index === 0 ? 'main' : 'gallery'}
          loading={index === 0 ? 'eager' : 'lazy'}
        />
      </div>
    </div>
  );
};
