import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Message } from 'api';
import clsx from 'clsx';
import { FC, ReactNode, useMemo } from 'react';
import { MessageReorderHandle } from './MessageReorderHandle';
interface Props {
  className?: string;
  children: ReactNode;
  message: Message;
  draggable?: boolean;
  continuous?: boolean;
  optimistic?: boolean;
}

export const MessageBox: FC<Props> = (
  { className = '', children, draggable = false, message, continuous = false, optimistic = false },
) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id: message.id, data: { message }, disabled: !draggable });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
  }), [transform, transition]);
  const handle = useMemo(() => (
    draggable
      ? (
        <MessageReorderHandle
          ref={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
          loading={optimistic}
        />
      )
      : <div className="col-span-1 row-span-full h-full" />
  ), [
    attributes,
    draggable,
    listeners,
    optimistic,
    setActivatorNodeRef,
  ]);
  return (
    <div
      className={clsx(
        'grid py-2 px-2 items-center group gap-2 grid-flow-col',
        'grid-cols-[2rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[2rem_12rem_minmax(0,1fr)]',
        !continuous && 'grid-rows-2 @2xl:grid-rows-1',
        isDragging && 'opacity-0',
        className,
      )}
      ref={setNodeRef}
      style={style}
    >
      {handle}
      {children}
    </div>
  );
};
