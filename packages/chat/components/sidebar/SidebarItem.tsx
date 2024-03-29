import clsx from 'clsx';
import { X } from 'icons';
import { FC, ReactNode, useMemo } from 'react';

interface Props {
  onClick?: () => void;
  varant?: 'default' | 'flat';
  icon?: ReactNode;
  active?: boolean;
  toggle?: boolean;
  children?: ReactNode;
}

export const SidebarItem: FC<Props> = ({
  onClick,
  icon,
  children,
  active = false,
  toggle = false,
  varant = 'default',
}) => {
  const extraNode = useMemo(() => {
    if (toggle) {
      return (
        <span
          className={clsx(
            'transition-opacity duration-100 ease-in-out',
            active ? 'opacity-100' : 'opacity-0',
            'text-surface-400 group-hover:text-brand-600 inline-flex w-5 items-center justify-center text-center',
          )}
        >
          <X />
        </span>
      );
    }
    return null;
  }, [active, toggle]);
  return (
    <div className="px-2 py-0.5">
      <button
        onClick={onClick}
        className={clsx(
          'group relative flex w-full items-center justify-center gap-1 rounded-sm py-1 text-left',
          onClick ? 'hover:bg-surface-100 cursor-pointer' : 'cursor-default',
          'px-1 text-left  text-sm',
          active && 'bg-surface-50',
        )}
      >
        {icon && <span className={active ? 'text-surface-600' : 'text-surface-400'}>{icon}</span>}
        <span className={clsx('flex-grow text-left')}>{children}</span>

        {extraNode}
      </button>
    </div>
  );
};
