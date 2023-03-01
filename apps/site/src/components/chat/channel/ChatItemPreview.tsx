import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Preview } from 'api';
import clsx from 'clsx';
import type { FC } from 'react';

interface Props {
  preview: Preview;
  optimistic?: boolean;
  className?: string;
}

export const ChatItemPreview: FC<Props> = ({ preview, className = '', optimistic = false }) => {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: preview.id, disabled: true });

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
      <span className="font-bold ml-8">{preview.name}</span>: {preview.text}
    </div>
  );
};
