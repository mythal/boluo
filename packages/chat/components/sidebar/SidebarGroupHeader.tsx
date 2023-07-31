import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'icons';
import { FC, ReactNode } from 'react';

interface Props {
  disabled?: boolean;
  folded: boolean;
  toggle: () => void;
  children: ReactNode;
  icon?: typeof ChevronDown;
}

export const SidebarGroupHeader: FC<Props> = ({ folded, toggle, children, disabled = false, icon: Icon }) => {
  return (
    <button
      onClick={toggle}
      className="flex gap-2 items-center justify-between w-full text-surface-600 py-3 px-4 border-surface-100 group cursor-pointer hover:bg-surface-100"
    >
      <div className="flex text-left gap-2 min-w-0 text-base">
        {children}
      </div>
      {!disabled && (
        <span
          className={clsx(
            'w-8 h-8 flex-none inline-flex items-center justify-center border rounded-md bg-surface-50 text-sm',
            folded ? 'group-hover:border-surface-300' : 'border-surface-400',
          )}
        >
          {Icon == null ? (folded ? <ChevronDown /> : <ChevronUp />) : <Icon />}
        </span>
      )}
    </button>
  );
};
