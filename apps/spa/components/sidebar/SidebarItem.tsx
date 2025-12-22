import clsx from 'clsx';
import X from '@boluo/icons/X';
import { type FC, type ReactNode, useMemo } from 'react';

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
}) => {
  const extraNode = useMemo(() => {
    if (toggle) {
      return (
        <span
          className={clsx(
            'transition-opacity duration-100 ease-in-out',
            active ? 'opacity-100' : 'opacity-0',
            'text-text-subtle group-hover:text-brand-strong inline-flex w-5 items-center justify-center text-center',
          )}
        >
          <X />
        </span>
      );
    }
    return null;
  }, [active, toggle]);
  const iconNode = useMemo(
    () => (
      <span
        className={clsx(
          'flex h-5 w-5 items-center justify-center',
          icon && (active ? 'text-text-secondary' : 'text-text-subtle'),
        )}
        aria-hidden={!icon}
      >
        {icon}
      </span>
    ),
    [active, icon],
  );
  return (
    <div className="px-3 py-0.5">
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={clsx(
          'group relative grid w-full grid-cols-[1.25rem_1fr_auto] items-center gap-x-1 rounded px-1 py-1 text-left text-sm',
          onClick ? 'not-pressed:hover:bg-sidebar-item-hover-bg cursor-pointer' : 'cursor-default',
          'pressed:bg-sidebar-item-active-bg',
        )}
      >
        {iconNode}
        <span className="text-left">{children}</span>

        {extraNode}
      </button>
    </div>
  );
};
