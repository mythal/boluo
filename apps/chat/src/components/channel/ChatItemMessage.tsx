import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Message } from 'api';
import clsx from 'clsx';
import { FC, useMemo } from 'react';
import { MessageReorderHandle } from './MessageReorderHandle';
import { Name } from './Name';

interface Props {
  message: Message;
  optimistic?: boolean;
  className?: string;
  self: boolean;
  isContinuous?: boolean;
}

export const ChatItemMessage: FC<Props> = (
  { message, className = '', optimistic = false, self, isContinuous = false },
) => {
  const disableDrag = !self;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id, data: { message }, disabled: disableDrag || optimistic });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { isMaster, isAction } = message;

  const name = useMemo(
    () => <Name name={message.name} isMaster={isMaster} self={self} />,
    [isMaster, message.name, self],
  );

  return (
    <div
      className={clsx(
        'grid py-2 px-2 items-center group gap-2 grid-flow-col',
        'grid-cols-[2rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[2rem_12rem_minmax(0,1fr)]',
        !isContinuous && 'grid-rows-2 @2xl:grid-rows-1',
        isDragging && 'opacity-0',
      )}
      ref={setNodeRef}
      style={style}
    >
      {disableDrag
        ? <div className="col-span-1 row-span-2 h-full" />
        : <MessageReorderHandle attributes={attributes} listeners={listeners} loading={optimistic} />}
      <div className={clsx('@2xl:text-right', isContinuous ? 'hidden @2xl:block' : '')}>
        {isContinuous || isAction ? null : name}
      </div>
      <div>
        {isAction && name} {message.text}
      </div>
    </div>
  );
};
