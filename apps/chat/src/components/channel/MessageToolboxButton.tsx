import clsx from 'clsx';
import { FC, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  type?: 'NORMAL' | 'DANGER';
  onClick?: () => void;
}

export const MessageToolboxButton: FC<Props> = ({ children, onClick, type = 'NORMAL' }) => {
  const danger = type === 'DANGER';
  return (
    <button
      className={clsx('p-2 hover:bg-surface-300 items-center flex gap-1', danger && 'text-error-600')}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
