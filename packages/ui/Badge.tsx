import clsx from 'clsx';
import { FC, ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}

export const Badge: FC<Props> = ({ icon, children, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-surface-100 border-surface-300 inline-flex gap-1 rounded-lg border px-1 py-0.5 text-sm',
        onClick != null ? 'hover:bg-surface-50 hover:border-surface-500 cursor-pointer select-none' : '',
      )}
    >
      {icon}
      {children}
    </div>
  );
};
