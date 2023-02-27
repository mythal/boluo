import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { GripVertical } from 'icons';
import { FC } from 'react';
import { Spinner } from 'ui';

type UseSortableReturn = ReturnType<typeof useSortable>;

interface Props {
  listeners?: UseSortableReturn['listeners'];
  attributes?: UseSortableReturn['attributes'];
  loading?: boolean;
}

export const MessageReorderHandle: FC<Props> = ({ listeners, attributes, loading = false }) => {
  if (loading) {
    listeners = undefined;
    attributes = undefined;
  }
  return (
    <div
      {...listeners}
      {...attributes}
      className={clsx(
        'inline-flex w-6 h-6 items-center justify-center text-surface-300 rounded-sm',
        !loading && 'group-hover:bg-surface-500/10 hover:text-surface-700 cursor-move',
        loading && 'cursor-not-allowed',
      )}
    >
      {loading ? <Spinner /> : <GripVertical />}
    </div>
  );
};
