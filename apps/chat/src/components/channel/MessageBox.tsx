import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Message } from 'api';
import clsx from 'clsx';
import { FC, ReactNode, useMemo } from 'react';
import { Delay } from '../Delay';
import { MessageReorderHandle } from './MessageReorderHandle';
import { MessageToolbox } from './MessageToolbox';
interface Props {
  className?: string;
  children: ReactNode;
  message: Message;
  draggable?: boolean;
  continuous?: boolean;
  optimistic?: boolean;
  self: boolean;
}

export const MessageBox: FC<Props> = (
  { className = '', children, draggable = false, message, continuous = false, optimistic = false, self },
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
  const toolbox = useMemo(() => (
    <Delay timeout={400}>
      <div
        className={clsx(
          'absolute right-4 max-h-full z-10 group-hover:z-20 top-0',
          'pointer-events-none group-hover:pointer-events-auto group-hover:block opacity-0 transition-all duration-100 group-hover:opacity-100 ease-in -translate-y-2 group-hover:translate-y-1',
        )}
      >
        <MessageToolbox message={message} />
      </div>
    </Delay>
  ), [message]);
  return (
    <div
      className={clsx(
        'grid py-2 pl-2 pr-2 items-center group gap-2 grid-flow-col relative hover:bg-surface-100',
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
      {self && toolbox}
    </div>
  );
};
