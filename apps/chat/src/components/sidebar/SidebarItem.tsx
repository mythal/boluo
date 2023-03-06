import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

interface Props {
  onClick: () => void;
  icon?: ReactNode;
  active?: boolean;
  toggle?: boolean;
  children: ReactNode;
}

export const SidebarItem: FC<Props> = ({ onClick, icon, children, active = false, toggle = false }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex text-left items-center gap-1 w-full py-2 px-4 hover:bg-surface-200',
        toggle && [
          'border-r-1',
          active ? 'border-brand-500' : 'border-surface-300',
        ],
        active && 'bg-surface-100',
      )}
    >
      <span className={active ? 'text-surface-600' : 'text-surface-400'}>{icon}</span>
      {children}
    </button>
  );
};
