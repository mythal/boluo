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
        'flex items-center gap-1 p-1.5 first-of-type:rounded-l-sm last-of-type:rounded-r-sm',
        on ? 'bg-brand-600 text-lowest' : '',
        danger && 'text-error-600',
      )}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
