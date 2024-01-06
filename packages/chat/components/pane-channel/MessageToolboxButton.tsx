import clsx from 'clsx';
import { FC, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  type?: 'NORMAL' | 'DANGER';
  onClick?: () => void;
  on?: boolean;
}

export const MessageToolboxButton: FC<Props> = ({ children, onClick, type = 'NORMAL', on }) => {
  const danger = type === 'DANGER';
  return (
    <button
      className={clsx(
        'flex  items-center gap-1 p-2 first-of-type:rounded-l-sm last-of-type:rounded-r-sm',
        on ? 'bg-surface-400 hover:bg-surface-500 text-surface-100' : 'hover:bg-surface-300 active:bg-surface-400',
        danger && 'text-error-600',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
