import clsx from 'clsx';

interface Props {
  inGame?: boolean;
  pos?: number;
  continued?: boolean;
  highlighted?: boolean;
  lifting?: boolean;
  disableHoverEffect?: boolean;
  handleDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
  handlePointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerLeave?: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
  className?: string;
  isInGameChannel?: boolean;
  isDragging?: boolean;
  style?: React.CSSProperties;
  setRef?: (node: HTMLDivElement | null) => void;
  timestamp?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export function MessageBox({
  inGame = false,
  pos,
  continued = false,
  highlighted = false,
  lifting = false,
  disableHoverEffect = false,
  handleContextMenu,
  handleDoubleClick,
  handlePointerDown,
  handlePointerUp,
  handlePointerLeave,
  handlePointerCancel,
  className,
  isInGameChannel = false,
  isDragging = false,
  style,
  setRef,
  timestamp,
  toolbar,
  children,
}: Props) {
  const outOfGameMessageInInGameChannel = !inGame && isInGameChannel;
  return (
    <div
      data-lifting={lifting}
      data-in-game={inGame}
      data-pos={pos}
      className={clsx(
        'MessageBox',
        'group/msg data relative grid grid-flow-col items-center gap-2 py-2 pr-2 pl-2',
        'grid-cols-[1.5rem_minmax(0,1fr)]',
        'irc:grid-cols-[1.5rem_12rem_minmax(0,1fr)]',
        continued ? 'continued-message' : 'irc:grid-rows-1 grid-rows-[auto_auto]',
        highlighted && 'shadow-[0_0_0_2px_var(--color-brand-strong)_inset]',
        outOfGameMessageInInGameChannel
          ? [
              'text-text-secondary msg-large:msg-large:text-base msg-large:text-base text-sm',
              !disableHoverEffect && 'hover:text-text-primary',
            ]
          : 'msg-large:text-lg msg-large:leading-7',
        inGame
          ? lifting
            ? 'bg-message-in-game-bg-hover'
            : ['bg-message-in-game-bg', !disableHoverEffect && 'hover:bg-message-in-game-bg-hover']
          : [
              lifting
                ? 'bg-message-out-of-game-bg-hover'
                : [
                    'bg-message-out-of-game-bg',
                    !disableHoverEffect && 'hover:bg-message-out-of-game-bg-hover',
                  ],
            ],
        'data-[lifting=true]:cursor-grabbing data-[lifting=true]:shadow-md',
        isDragging && 'opacity-0',
        className,
      )}
      ref={setRef}
      style={style}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
    >
      {children}

      <div className="compact:hidden absolute top-1 right-2 select-none">{timestamp}</div>
      {toolbar}
    </div>
  );
}
