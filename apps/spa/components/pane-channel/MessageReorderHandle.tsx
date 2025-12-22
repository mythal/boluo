import type { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import MoveVertical from '@boluo/icons/MoveVertical';
import { type FC, useMemo, type ReactNode } from 'react';
import { Spinner } from '@boluo/ui/Spinner';
import { MessageHandleBox } from '@boluo/ui/chat/MessageHandleBox';
import { Delay } from '@boluo/ui/Delay';
import { type FailTo } from '../../state/channel.types';
import { useIsOptimistic } from '../../hooks/useIsOptimistic';
import { ChatItemMessageFail } from './ChatItemMessageFail';

type UseSortableReturn = ReturnType<typeof useSortable>;

interface Props {
  draggable: boolean;
  lifting?: boolean;
  listeners?: UseSortableReturn['listeners'];
  attributes?: UseSortableReturn['attributes'];
  timestamp?: ReactNode;
  children?: React.ReactNode;
  failTo: FailTo | null | undefined;
  ref?: React.Ref<HTMLDivElement>;
}

export const MessageReorderHandle: FC<Props> = ({
  lifting = false,
  listeners,
  attributes,
  draggable,
  failTo,
  timestamp,
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
  const canBeDragged = !lifting && draggable && !loading && failTo == null;
  return (
    <MessageHandleBox>
      <div
        ref={ref}
        {...listeners}
        {...attributes}
        className={clsx(
          'text-text-muted relative rounded-sm pl-2 text-right',
          lifting && 'cursor-grabbing',
          canBeDragged && 'hover:text-text-secondary cursor-grab',
          failTo != null && 'cursor-not-allowed',
          loading && 'cursor-wait',
        )}
      >
        <Delay fallback={null}>
          <div>{icon}</div>
        </Delay>
        <div className="compact:not-[.continued-message_&]:block absolute top-7 left-0 hidden -rotate-90">
          {timestamp}
        </div>
      </div>
    </MessageHandleBox>
  );
};
