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
        'group flex text-left items-center justify-center gap-1 w-full hover:bg-surface-100',
        isExpanded ? 'text-left text-sm  px-4 py-3' : 'text-center justify-center text-lg px-2 py-3',
        active && 'bg-surface-50',
      )}
    >
      <span className={active ? 'text-surface-600' : 'text-surface-400'}>{icon}</span>
      <span className={clsx(isExpanded ? 'text-left' : 'hidden', 'flex-grow')}>
        {isExpanded && children}
      </span>

      {toggle && (
        <span className={clsx(isExpanded ? '' : 'hidden', active ? 'text-brand-500' : 'text-surface-300')}>
          {active ? '•' : '•'}
        </span>
      )}
    </button>
  );
};
