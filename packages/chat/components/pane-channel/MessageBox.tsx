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
  mini?: boolean;
  optimistic?: boolean;
  self: boolean;
  iAmMaster: boolean;
  iAmAdmin: boolean;
}

export const MessageBox: FC<Props> = ({
  className = '',
  children,
  draggable = false,
  message,
  mini = false,
  optimistic = false,
  self,
  iAmMaster,
  iAmAdmin,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({
    id: message.id,
    data: { message },
    disabled: !draggable,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition],
  );
  const handle = useMemo(
    () =>
      draggable ? (
        <MessageReorderHandle
          ref={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
          loading={optimistic}
        />
      ) : (
        <div className="col-span-1 row-span-full h-full" />
      ),
    [attributes, draggable, listeners, optimistic, setActivatorNodeRef],
  );
  const toolbox = useMemo(
    () => (
      <Delay timeout={400}>
        <div
          className={clsx(
            'absolute right-4 top-0 z-10 max-h-full group-hover:z-20',
            'pointer-events-none -translate-y-2 opacity-0 transition-all duration-100 ease-in group-hover:pointer-events-auto group-hover:block group-hover:translate-y-1 group-hover:opacity-100',
          )}
        >
          <MessageToolbox message={message} self={self} iAmAdmin={iAmAdmin} iAmMaster={iAmMaster} />
        </div>
      </Delay>
    ),
    [iAmAdmin, iAmMaster, message, self],
  );
  return (
    <div
      className={clsx(
        'hover:bg-surface-100 group relative grid grid-flow-col items-center gap-2 py-2 pl-2 pr-2',
        'grid-cols-[2rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[2rem_12rem_minmax(0,1fr)]',
        !mini && '@2xl:grid-rows-1 grid-rows-[auto_auto]',
        isDragging && 'opacity-0',
        className,
      )}
      ref={setNodeRef}
      style={style}
    >
      {handle}
      {children}
      {(self || iAmMaster || iAmAdmin) && toolbox}
    </div>
  );
};
