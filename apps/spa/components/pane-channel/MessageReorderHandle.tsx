import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { MoveVertical, TriangleAlert } from '@boluo/icons';
import { forwardRef, type ReactNode } from 'react';
import { Spinner } from '@boluo/ui/Spinner';
import { Delay } from '../Delay';
import { type FailTo } from '../../state/channel.types';

type UseSortableReturn = ReturnType<typeof useSortable>;

interface Props {
  listeners?: UseSortableReturn['listeners'];
  attributes?: UseSortableReturn['attributes'];
  loading?: boolean;
  children?: React.ReactNode;
  failTo: FailTo | null | undefined;
}

export const MessageReorderHandle = forwardRef<HTMLDivElement, Props>(
  ({ listeners, attributes, loading = false, failTo }, ref) => {
    if (loading) {
      listeners = undefined;
      attributes = undefined;
    }
    let icon: ReactNode;
    if (failTo) {
      icon = <TriangleAlert className="text-text-danger inline text-xs" />;
    } else if (loading) {
      icon = <Spinner className="inline text-xs" />;
    } else {
      icon = <MoveVertical className="inline text-xs" />;
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
            <div>{icon}</div>
          </Delay>
        </div>
      </div>
    );
  },
);
MessageReorderHandle.displayName = 'MessageReorderHandle';
