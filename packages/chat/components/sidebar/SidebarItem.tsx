import clsx from 'clsx';
import { X } from 'icons';
import { FC, ReactNode, useMemo } from 'react';
import { useSidebarState } from './useSidebarState';

interface Props {
  onClick?: () => void;
  onAdd?: () => void;
  onClose?: () => void;
  varant?: 'default' | 'flat';
  icon?: ReactNode;
  active?: boolean;
  toggle?: boolean;
  children?: ReactNode;
}

const SidebarItemExtraButton: FC<{ onClick: () => void; children: ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={clsx(
      'transition-opacity duration-100 ease-out opacity-50 group-hover:opacity-100',
      'flex-none inline-flex items-center justify-center',
      'w-6 h-6 rounded-sm border border-surface-50 text-center group-hover:border-surface-200',
      'text-surface-400  bg-lowest hover:border-surface-400 hover:text-surface-600',
    )}
  >
    {children}
  </button>
);

export const SidebarItem: FC<Props> = (
  { onClick, onClose, onAdd, icon, children, active = false, toggle = false, varant = 'default' },
) => {
  const { isExpanded } = useSidebarState();
  const extraNode = useMemo(() => {
    if (toggle) {
      return (
        <span
          className={clsx(
            'inline-block w-4 text-center text-surface-400 group-hover:text-brand-500',
            isExpanded ? '' : 'hidden',
          )}
        >
          {active ? '×' : '•'}
        </span>
      );
    }
    if (onClose) {
      return (
        <SidebarItemExtraButton onClick={onClose}>
          <span className="transition-transform transform duration-100">
            <X />
          </span>
        </SidebarItemExtraButton>
      );
    }
    if (onAdd) {
      return (
        <SidebarItemExtraButton onClick={onAdd}>
          <span className="transition-transform duration-100 transform rotate-45">
            <X />
          </span>
        </SidebarItemExtraButton>
      );
    }
    return null;
  }, [active, isExpanded, onAdd, onClose, toggle]);
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group flex text-left items-center justify-center gap-1 w-full min-h-[2rem] relative',
        onClick ? 'cursor-pointer hover:bg-surface-100' : 'cursor-default',
        isExpanded ? 'text-left text-sm  px-4' : 'text-center justify-center text-lg px-2',
        varant === 'flat' ? 'py-2' : 'py-3',
        active && 'bg-surface-50',
      )}
    >
      {icon && <span className={active ? 'text-surface-600' : 'text-surface-400'}>{icon}</span>}
      <span className={clsx(isExpanded ? 'text-left' : 'hidden', 'flex-grow')}>
        {isExpanded && children}
      </span>

      {extraNode}
    </button>
  );
};
