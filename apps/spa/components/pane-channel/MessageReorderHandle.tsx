import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { MoveVertical, TriangleAlert } from '@boluo/icons';
import { FC, useEffect, useMemo, type ReactNode } from 'react';
import { Spinner } from '@boluo/ui/Spinner';
import { MessageHandleBox } from '@boluo/ui/chat/MessageHandleBox';
import { Delay } from '@boluo/ui/Delay';
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
  const icon: ReactNode = useMemo(() => {
    if (failTo) {
      return <ChatItemMessageFail failTo={failTo} />;
    } else if (loading) {
      return <Spinner className="inline text-xs" />;
    } else if (draggable) {
      return <MoveVertical className="inline text-xs" />;
    }
  }, [failTo, loading, draggable]);
  return (
    <MessageHandleBox>
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
        <Delay fallback={null}>
          <div>{icon}</div>
        </Delay>
      </div>
    </MessageHandleBox>
  );
};
