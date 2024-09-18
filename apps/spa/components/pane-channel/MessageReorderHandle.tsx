import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { MoveVertical } from '@boluo/icons';
import { forwardRef, type ReactNode } from 'react';
import { Spinner } from '@boluo/ui/Spinner';
import { Delay } from '../Delay';
import { type FailTo } from '../../state/channel.types';
import { useIsOptimistic } from '../../hooks/useIsOptimistic';
import { ChatItemMessageFail } from './ChatItemMessageFail';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';

type UseSortableReturn = ReturnType<typeof useSortable>;

interface Props {
  draggable: boolean;
  listeners?: UseSortableReturn['listeners'];
  attributes?: UseSortableReturn['attributes'];
  children?: React.ReactNode;
  failTo: FailTo | null | undefined;
}

export const MessageReorderHandle = forwardRef<HTMLDivElement, Props>(
  ({ draggable, listeners, attributes, failTo }, ref) => {
    const loading = useIsOptimistic();
    if (loading || !draggable) {
      listeners = undefined;
      attributes = undefined;
    }
    let icon: ReactNode = null;
    if (failTo) {
      icon = <ChatItemMessageFail failTo={failTo} />;
    } else if (loading) {
      icon = <Spinner className="inline text-xs" />;
    } else if (draggable) {
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
            draggable && !loading && failTo == null && 'hover:text-message-handle-hover-text cursor-move',
            failTo != null && 'cursor-not-allowed',
            loading && 'cursor-wait',
          )}
        >
          <Delay fallback={<FallbackIcon />}>{icon}</Delay>
        </div>
      </div>
    );
  },
);
MessageReorderHandle.displayName = 'MessageReorderHandle';
