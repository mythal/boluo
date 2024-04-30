import clsx from 'clsx';
import { FC, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  type?: 'NORMAL' | 'DANGER';
  onClick?: () => void;
  onMouseEnter?: () => void;
  on?: boolean;
}

export const MessageToolboxButton: FC<Props> = ({ children, onClick, onMouseEnter, type = 'NORMAL', on }) => {
  const danger = type === 'DANGER';
  return (
    <button
      className={clsx(
        'flex items-center gap-1 px-2 py-1 first-of-type:rounded-l last-of-type:rounded-r',
        on ? 'bg-message-toolbox-active-bg hover:bg-message-toolbox-active-bg/85 text-lowest' : 'hover:bg-highest/10',
        danger && 'text-message-toolbox-danger',
      )}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
