import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Message } from 'api';
import clsx from 'clsx';
import { GripVertical } from 'icons';
import type { FC } from 'react';
import { Icon } from 'ui';
interface Props {
  message: Message;
  className?: string;
}

export const MessageListItem: FC<Props> = ({ message, className = '' }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id, data: { message } });

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
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-surface-300 rounded-sm group-hover:bg-surface-500/10 hover:text-surface-700 cursor-move"
      >
        <GripVertical />
      </button>
      <span className="font-bold">{message.name}</span>: {message.text}
    </div>
  );
};
