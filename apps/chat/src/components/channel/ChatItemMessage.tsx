import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Message } from 'api';
import clsx from 'clsx';
import { useMe } from 'common';
import type { FC } from 'react';
import { MessageReorderHandle } from './MessageReorderHandle';

interface Props {
  message: Message;
  optimistic?: boolean;
  className?: string;
}

export const ChatItemMessage: FC<Props> = ({ message, className = '', optimistic = false }) => {
  const me = useMe();
  const disableDrag = me === null || message.senderId !== me.user.id;
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

  return (
    <div
      className={clsx('py-2 px-2 flex items-center group gap-2', isDragging && 'opacity-0')}
      ref={setNodeRef}
      style={style}
    >
      {disableDrag
        ? <div className="w-6 h-6" />
        : <MessageReorderHandle attributes={attributes} listeners={listeners} loading={optimistic} />}
      <span className="font-bold">{message.name}</span>: {message.text}
    </div>
  );
};
