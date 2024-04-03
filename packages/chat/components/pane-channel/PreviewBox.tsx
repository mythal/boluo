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
  inGame: boolean;
  onDrop?: DragEventHandler;
}

export const PreviewBox: FC<Props> = ({
  id,
  children,
  className = '',
  editMode = false,
  inGame,
  isSelf = false,
  onDrop,
}) => {
  const { setNodeRef, transform, transition } = useSortable({ id, disabled: true });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    '--bg-angle': isSelf ? '135deg' : '225deg',
  };
  const handlePlaceHolder = useMemo(() => <PreviewHandlePlaceHolder editMode={editMode} />, [editMode]);
  return (
    <div
      data-in-game={inGame}
      className={clsx(
        'group grid grid-flow-col grid-rows-[auto_auto] items-start gap-x-2 gap-y-1 px-2 py-2',
        'grid-cols-[4rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[4rem_12rem_minmax(0,1fr)] @2xl:grid-rows-1',
        isSelf ? 'border-preview-self border-b border-t' : '',
        'data-[in-game=true]:bg-message-inGame-bg bg-[length:200%_200%]',
        isSelf ? 'animate-[bg-x-move_60s_linear_infinite_reverse]' : 'animate-[bg-x-move_100s_linear_infinite]',
        'bg-[repeating-linear-gradient(var(--bg-angle),transparent_0,transparent_5px,var(--colors-preview-hint)_6px)]',
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
