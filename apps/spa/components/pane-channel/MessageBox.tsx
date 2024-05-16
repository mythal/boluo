import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Message } from '@boluo/api';
import clsx from 'clsx';
import { FC, ReactNode, useMemo } from 'react';
import { Delay } from '../Delay';
import { MessageReorderHandle } from './MessageReorderHandle';
import { MessageToolbox } from './MessageToolbox';
import { MessageTime } from './MessageTime';
interface Props {
  className?: string;
  children: ReactNode;
  message: Message;
  draggable?: boolean;
  mini?: boolean;
  overlay?: boolean;
  optimistic?: boolean;
  self: boolean;
  iAmMaster: boolean;
  iAmAdmin: boolean;
  isScrolling: boolean;
  inGame: boolean;
}

export const MessageBox: FC<Props> = ({
  className = '',
  inGame,
  children,
  draggable = false,
  overlay = false,
  message,
  mini = false,
  isScrolling,
  optimistic = false,
  self,
  iAmMaster,
  iAmAdmin,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({
    id: message.id,
    data: { message },
    disabled: !draggable || isScrolling,
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
        >
          <MessageTime message={message} />
        </MessageReorderHandle>
      ) : (
        <div className="text-message-time-text col-span-1 row-span-full h-full text-right">
          <MessageTime message={message} />
        </div>
      ),
    [attributes, draggable, listeners, message, optimistic, setActivatorNodeRef],
  );
  const toolbox = useMemo(
    () => (
      <Delay timeout={400}>
        <div
          className={clsx(
            'absolute right-3 top-0 z-10 hidden max-h-full -translate-y-4 group-hover:z-20 group-hover:block',
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
      data-overlay={overlay}
      data-in-game={inGame}
      className={clsx(
        'group relative grid grid-flow-col items-center gap-2 py-2 pl-2 pr-2',
        'grid-cols-[4rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[4rem_12rem_minmax(0,1fr)]',
        !mini && '@2xl:grid-rows-1 grid-rows-[auto_auto]',
        inGame ? 'bg-message-inGame-bg hover:bg-message-inGame-hover-bg' : 'hover:bg-message-hover-bg',
        'data-[overlay=true]:bg-surface-300/30 data-[overlay=true]:data-[in-game=true]:bg-message-inGame-bg/75 data-[overlay=true]:backdrop-blur-sm',
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
