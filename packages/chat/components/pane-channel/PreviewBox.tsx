import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { DragEventHandler, FC, ReactNode } from 'react';
import { PreviewHandlePlaceHolder } from './PreviewHandlePlaceHolder';

interface Props {
  children: ReactNode;
  id: string;
  className?: string;
  editMode?: boolean;
  onDrop?: DragEventHandler;
}

export const PreviewBox: FC<Props> = ({ id, children, className = '', editMode = false, onDrop }) => {
  const {
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled: true });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      className={clsx(
        'grid py-2 px-2 items-start group gap-x-2 gap-y-1 grid-flow-col grid-rows-[auto_auto]',
        'grid-cols-[2rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[2rem_12rem_minmax(0,1fr)] @2xl:grid-rows-1',
        className,
      )}
      ref={setNodeRef}
      style={style}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <PreviewHandlePlaceHolder editMode={editMode} />
      {children}
    </div>
  );
};
