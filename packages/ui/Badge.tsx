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
        'rounded-lg inline-flex text-sm gap-1 py-0.5 px-1 bg-surface-100 border border-surface-300',
        onClick != null ? 'cursor-pointer select-none hover:bg-surface-50 hover:border-surface-500' : '',
      )}
    >
      {icon}
      {children}
    </div>
  );
};
