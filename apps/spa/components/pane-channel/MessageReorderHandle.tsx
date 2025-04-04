import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { MoveVertical, TriangleAlert } from '@boluo/icons';
import { type ReactNode } from 'react';
import { Spinner } from '@boluo/ui/Spinner';
import { Delay } from '../Delay';
import { type FailTo } from '../../state/channel.types';
import { useIsOptimistic } from '../../hooks/useIsOptimistic';

type UseSortableReturn = ReturnType<typeof useSortable>;

interface Props {
  listeners?: UseSortableReturn['listeners'];
  attributes?: UseSortableReturn['attributes'];
  children?: React.ReactNode;
  failTo: FailTo | null | undefined;
  ref?: React.Ref<HTMLDivElement>;
}

export const MessageReorderHandle = ({ listeners, attributes, failTo, ref }: Props) => {
  const loading = useIsOptimistic();
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
};
