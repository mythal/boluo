import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { type DragEventHandler, type FC, type ReactNode, useEffect, useMemo, useRef } from 'react';
import { PreviewHandlePlaceHolder } from './PreviewHandlePlaceHolder';
import { useReadObserve } from '../../hooks/useReadObserve';

interface Props {
  children: ReactNode;
  id: string;
  className?: string;
  editMode?: boolean;
  isSelf?: boolean;
  isLast: boolean;
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
  isLast,
  onDrop,
}) => {
  const readObserve = useReadObserve();
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (boxRef.current == null) return;
    return readObserve(boxRef.current);
  }, [readObserve]);
  const { setNodeRef, transform, transition } = useSortable({ id, disabled: true });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    '--bg-angle': isSelf ? '135deg' : '225deg',
  };
  const handlePlaceHolder = useMemo(() => <PreviewHandlePlaceHolder editMode={editMode} />, [editMode]);
  return (
    <div
      data-id={id}
      data-is-last={isLast}
      data-in-game={inGame}
      className={clsx(
        'group grid grid-flow-col grid-rows-[auto_auto] items-start gap-x-2 gap-y-1 px-2 py-2',
        'grid-cols-[1.5rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[1.5rem_12rem_minmax(0,1fr)] @2xl:grid-rows-1',
        'data-[in-game=true]:bg-preview-in-bg data-[in-game=false]:bg-preview-out-bg',
        'bg-[radial-gradient(var(--colors-preview-hint)_1px,_transparent_1px)] bg-[length:10px_10px]',
        className,
      )}
      ref={(ref) => {
        setNodeRef(ref);
        boxRef.current = ref;
      }}
      style={style}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      {handlePlaceHolder}
      {children}
    </div>
  );
};
