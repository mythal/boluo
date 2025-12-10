import clsx from 'clsx';
import { CSS, type Transform } from '@dnd-kit/utilities';
import { type CSSProperties, type DragEventHandler, type FC } from 'react';
import { PreviewHandlePlaceHolder } from '../PreviewHandlePlaceHolder';

interface Props {
  isLast: boolean;
  inGame: boolean;
  isInGameChannel: boolean;
  id: string;
  pos: number;
  ref?: React.Ref<HTMLDivElement>;
  className?: string;
  children: React.ReactNode;
  onDrop?: DragEventHandler;
  inEditMode?: boolean;
  transform?: Transform | null;
  transition?: string | undefined;
  isSelf?: boolean;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

export const PreviewBox: FC<Props> = ({
  isLast,
  inGame,
  isInGameChannel,
  id,
  pos,
  ref,
  className,
  children,
  inEditMode = false,
  onDrop,
  transform = null,
  transition,
  isSelf = false,
  onMouseEnter,
  onMouseLeave,
}) => {
  const style: CSSProperties & { '--bg-angle': string } = {
    transform: CSS.Transform.toString(transform),
    transition,
    '--bg-angle': isSelf ? '135deg' : '225deg',
    backgroundImage: 'radial-gradient(var(--color-message-preview-dot) 1px, transparent 1px)',
    backgroundSize: '10px 10px',
    boxShadow: inGame
      ? 'inset 0 0 12px 10px var(--color-message-in-game-bg)'
      : 'inset 0 0 12px 10px var(--color-message-out-of-game-bg)',
  };
  const outOfGamePreviewInInGameChannel = !inGame && isInGameChannel;
  return (
    <div
      data-id={id}
      data-pos={pos}
      data-is-last={isLast}
      className={clsx(
        'group/item grid grid-flow-col grid-rows-[auto_auto] items-start gap-x-2 gap-y-1 px-2 py-2',
        'grid-cols-[1.5rem_minmax(0,1fr)]',
        'irc:grid-cols-[1.5rem_12rem_minmax(0,1fr)] irc:grid-rows-1',
        inGame ? 'bg-message-in-game-bg in-game-serif:font-old' : 'bg-message-out-of-game-bg',
        outOfGamePreviewInInGameChannel
          ? 'text-text-secondary hover:text-text-primary msg-large:text-base text-sm'
          : 'msg-large:text-lg msg-large:leading-7',
        className,
      )}
      ref={ref}
      style={style}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <PreviewHandlePlaceHolder editMode={inEditMode} />
      {children}
    </div>
  );
};
