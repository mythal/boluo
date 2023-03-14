import clsx from 'clsx';
import type { FC, ReactNode } from 'react';
import { useSidebarState } from './useSidebarState';

interface Props {
  onClick: () => void;
  icon?: ReactNode;
  active?: boolean;
  toggle?: boolean;
  children?: ReactNode;
}

export const SidebarItem: FC<Props> = (
  { onClick, icon, children, active = false, toggle = false },
) => {
  const { isExpanded } = useSidebarState();
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group flex text-left items-center gap-1 w-full hover:bg-surface-200',
        isExpanded ? 'text-left text-sm  px-4 py-3' : 'text-center justify-center text-lg px-2 py-3',
        toggle && [
          'border-r',
          active ? 'border-brand-500' : 'border-surface-200',
        ],
        active && 'bg-surface-100',
      )}
    >
      <span className={active ? 'text-surface-600' : 'text-surface-400'}>{icon}</span>
      {isExpanded && children}
    </button>
  );
};
