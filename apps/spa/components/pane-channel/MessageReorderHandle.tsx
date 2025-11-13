import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { MoveVertical, TriangleAlert } from '@boluo/icons';
import { FC, type ReactNode } from 'react';
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
  ref?: React.Ref<HTMLDivElement>;
}

export const MessageReorderHandle: FC<Props> = ({
  listeners,
  attributes,
  draggable,
  failTo,
  ref,
}) => {
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
          'text-text-muted rounded-sm pl-2 text-right',
          draggable && !loading && failTo == null && 'hover:text-text-secondary cursor-move',
          failTo != null && 'cursor-not-allowed',
          loading && 'cursor-wait',
        )}
      >
        <Delay>
          <div>{icon}</div>
        </Delay>
      </div>
    </div>
  );
};
