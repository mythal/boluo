import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { GripVertical, MoveVertical } from 'icons';
import { forwardRef } from 'react';
import { Spinner } from 'ui/Spinner';
import { Delay } from '../Delay';
import Icon from 'ui/Icon';

type UseSortableReturn = ReturnType<typeof useSortable>;

interface Props {
  listeners?: UseSortableReturn['listeners'];
  attributes?: UseSortableReturn['attributes'];
  loading?: boolean;
  children?: React.ReactNode;
}

export const MessageReorderHandle = forwardRef<HTMLDivElement, Props>(
  ({ listeners, attributes, loading = false, children = null }, ref) => {
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
          'text-surface-500 col-span-1 row-span-full h-full items-center rounded-sm  pl-2 text-right',
          !loading && ' hover:text-surface-700 cursor-move',
          loading && 'cursor-not-allowed',
        )}
      >
        <Delay>
          <div>
            {loading ? <Spinner className="inline text-xs" /> : <MoveVertical className="inline text-xs" />}
            {children}
          </div>
        </Delay>
      </div>
    );
  },
);
MessageReorderHandle.displayName = 'MessageReorderHandle';
