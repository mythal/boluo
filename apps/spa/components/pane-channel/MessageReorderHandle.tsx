import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { MoveVertical } from '@boluo/icons';
import { forwardRef } from 'react';
import { Spinner } from '@boluo/ui/Spinner';
import { Delay } from '../Delay';

type UseSortableReturn = ReturnType<typeof useSortable>;

interface Props {
  listeners?: UseSortableReturn['listeners'];
  attributes?: UseSortableReturn['attributes'];
  loading?: boolean;
  children?: React.ReactNode;
}

export const MessageReorderHandle = forwardRef<HTMLDivElement, Props>(
  ({ listeners, attributes, loading = false }, ref) => {
    if (loading) {
      listeners = undefined;
      attributes = undefined;
    }
    return (
      <div className="col-span-1 row-span-full h-full">
        <div
          ref={ref}
          {...listeners}
          {...attributes}
          className={clsx(
            'text-message-handle-text rounded-sm pl-2 text-right',
            !loading && 'hover:text-message-handle-hover-text cursor-move',
            loading && 'cursor-not-allowed',
          )}
        >
          <Delay>
            <div>{loading ? <Spinner className="inline text-xs" /> : <MoveVertical className="inline text-xs" />}</div>
          </Delay>
        </div>
      </div>
    );
  },
);
MessageReorderHandle.displayName = 'MessageReorderHandle';
