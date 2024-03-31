import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { DragEventHandler, FC, ReactNode, useMemo } from 'react';
import { PreviewHandlePlaceHolder } from './PreviewHandlePlaceHolder';

interface Props {
  children: ReactNode;
  id: string;
  className?: string;
  editMode?: boolean;
  onDrop?: DragEventHandler;
}

export const PreviewBox: FC<Props> = ({ id, children, className = '', editMode = false, onDrop }) => {
  const { setNodeRef, transform, transition } = useSortable({ id, disabled: true });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const handlePlaceHolder = useMemo(() => <PreviewHandlePlaceHolder editMode={editMode} />, [editMode]);
  return (
    <div
      className={clsx(
        'group grid grid-flow-col grid-rows-[auto_auto] items-start gap-x-2 gap-y-1 px-2 py-2',
        'grid-cols-[4rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[4rem_12rem_minmax(0,1fr)] @2xl:grid-rows-1',
        'after:content-[" "] relative after:pointer-events-none after:absolute after:block',
        'after:left-0 after:top-0 after:h-full after:w-full',
        'after:animate-pulse after:bg-[repeating-radial-gradient(circle_at_0_0,_transparent_0,_#6262d81e_11px)]',
        className,
      )}
      ref={setNodeRef}
      style={style}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      {handlePlaceHolder}
      {children}
    </div>
  );
};
