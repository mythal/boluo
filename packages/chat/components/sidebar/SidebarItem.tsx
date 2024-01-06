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
            'inline-flex justify-center items-center w-5 text-center text-surface-400 group-hover:text-brand-600',
          )}
        >
          <X />
        </span>
      );
    }
    return null;
  }, [active, toggle]);
  return (
    <div className="py-0.5 px-2">
      <button
        onClick={onClick}
        className={clsx(
          'group flex text-left items-center justify-center gap-1 w-full py-1 relative rounded-sm',
          onClick ? 'cursor-pointer hover:bg-surface-100' : 'cursor-default',
          'text-left text-sm  px-1',
          active && 'bg-surface-50',
        )}
      >
        {icon && <span className={active ? 'text-surface-600' : 'text-surface-400'}>{icon}</span>}
        <span className={clsx('text-left flex-grow')}>{children}</span>

        {extraNode}
      </button>
    </div>
  );
};
