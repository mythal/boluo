import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import {
  type CSSProperties,
  type DragEventHandler,
  type FC,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { PreviewHandlePlaceHolder } from './PreviewHandlePlaceHolder';
import { useReadObserve } from '../../hooks/useReadObserve';
import { useIsInGameChannel } from '../../hooks/useIsInGameChannel';

interface Props {
  children: ReactNode;
  id: string;
  className?: string;
  editMode?: boolean;
  isSelf?: boolean;
  isLast: boolean;
  inGame: boolean;
  onDrop?: DragEventHandler;
  pos: number;
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
  pos,
}) => {
  const readObserve = useReadObserve();
  const isInGameChannel = useIsInGameChannel();
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (boxRef.current == null) return;
    return readObserve(boxRef.current);
  }, [readObserve]);
  const { setNodeRef, transform, transition } = useSortable({ id, disabled: true });

  const style: CSSProperties & { '--bg-angle': string } = {
    transform: CSS.Transform.toString(transform),
    transition,
    '--bg-angle': isSelf ? '135deg' : '225deg',
    backgroundImage: 'radial-gradient(var(--color-border-subtle) 1px, transparent 1px)',
    backgroundSize: '10px 10px',
    boxShadow: inGame
      ? 'inset 0 0 12px 10px var(--color-message-inGame-bg)'
      : 'inset 0 0 12px 10px var(--color-surface-muted)',
  };
  const handlePlaceHolder = useMemo(
    () => <PreviewHandlePlaceHolder editMode={editMode} />,
    [editMode],
  );
  return (
    <div
      data-id={id}
      data-pos={pos}
      data-is-last={isLast}
      className={clsx(
        'group/item grid grid-flow-col grid-rows-[auto_auto] items-start gap-x-2 gap-y-1 px-2 py-2',
        'grid-cols-[1.5rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[1.5rem_12rem_minmax(0,1fr)] @2xl:grid-rows-1',
        inGame
          ? 'bg-message-inGame-bg'
          : [
              'bg-surface-muted',
              isInGameChannel ? 'text-text-secondary hover:text-text-primary text-sm' : '',
            ],
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
