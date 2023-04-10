import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Preview } from 'api';
import clsx from 'clsx';
import { FC, useMemo } from 'react';
import { Name } from './Name';
import { NameBox } from './NameBox';

interface Props {
  preview: Preview;
  className?: string;
  self: boolean;
}

export const ChatItemPreview: FC<Props> = ({ preview, className = '', self }) => {
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
  const { isAction, isMaster } = preview;
  const name = useMemo(
    () => <Name name={preview.name} isMaster={isMaster} self={self} />,
    [isMaster, preview.name, self],
  );
  return (
    <div
      className={clsx(
        'grid py-2 px-2 items-center group gap-2 grid-flow-col',
        'grid-cols-[2rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[2rem_12rem_minmax(0,1fr)]',
        isDragging && 'opacity-0',
        className,
      )}
      ref={setNodeRef}
      style={style}
    >
      <div />
      <div className="@2xl:text-right">
        {!isAction && name}
      </div>
      <div>
        {isAction && name}
        {preview.text}
      </div>
    </div>
  );
};
