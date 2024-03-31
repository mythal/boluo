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
  isSelf?: boolean;
  onDrop?: DragEventHandler;
}

export const PreviewBox: FC<Props> = ({ id, children, className = '', editMode = false, isSelf = false, onDrop }) => {
  const { setNodeRef, transform, transition } = useSortable({ id, disabled: true });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    '--bg-angle': isSelf ? '135deg' : '225deg',
    '--bg-width': '6px',
    '--bg-dark-color': 'rgba(0,0,255,15%)',
    '--bg-light-color': 'rgba(0,0,255,5%)',
  };
  const handlePlaceHolder = useMemo(() => <PreviewHandlePlaceHolder editMode={editMode} />, [editMode]);
  return (
    <div
      className={clsx(
        'group grid grid-flow-col grid-rows-[auto_auto] items-start gap-x-2 gap-y-1 px-2 py-2',
        'grid-cols-[4rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[4rem_12rem_minmax(0,1fr)] @2xl:grid-rows-1',
        'bg-[length:200%_200%]',
        isSelf
          ? 'animate-[bg-x-move_100s_linear_infinite_reverse] bg-[repeating-linear-gradient(var(--bg-angle),transparent_0,var(--bg-light-color)_var(--bg-width))] dark:bg-[repeating-linear-gradient(var(--bg-angle),transparent_0,var(--bg-dark-color)_var(--bg-width))]'
          : 'animate-[bg-x-move_100s_linear_infinite] bg-[repeating-linear-gradient(var(--bg-angle),transparent_0,var(--bg-light-color)_var(--bg-width))] dark:bg-[repeating-linear-gradient(var(--bg-angle),transparent_0,var(--bg-dark-color)_var(--bg-width))]',
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
