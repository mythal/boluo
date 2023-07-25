import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { GripVertical } from 'icons';
import { forwardRef } from 'react';
import { Spinner } from 'ui/Spinner';
import { Delay } from '../Delay';

type UseSortableReturn = ReturnType<typeof useSortable>;

interface Props {
  listeners?: UseSortableReturn['listeners'];
  attributes?: UseSortableReturn['attributes'];
  loading?: boolean;
}

export const MessageReorderHandle = forwardRef<HTMLDivElement, Props>(
  ({ listeners, attributes, loading = false }, ref) => {
    if (loading) {
      listeners = undefined;
      attributes = undefined;
    }
    return (
      <div
        ref={ref}
        {...listeners}
        {...attributes}
        className={clsx(
          'inline-flex h-full col-span-1 row-span-full items-center justify-center text-surface-300 rounded-sm',
          !loading && 'group-hover:bg-surface-500/10 hover:text-surface-700 cursor-move',
          loading && 'cursor-not-allowed',
        )}
      >
        <Delay>
          {loading ? <Spinner /> : <GripVertical />}
        </Delay>
      </div>
    );
  },
);
MessageReorderHandle.displayName = 'MessageReorderHandle';
