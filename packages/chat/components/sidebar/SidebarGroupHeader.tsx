import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'icons';
import { FC, ReactNode } from 'react';

interface Props {
  disabled?: boolean;
  folded: boolean;
  toggle: () => void;
  children: ReactNode;
}

export const SidebarGroupHeader: FC<Props> = ({ folded, toggle, children, disabled = false }) => {
  return (
    <button
      onClick={toggle}
      className="flex gap-2 items-center justify-between w-full text-surface-600 py-3 px-4 text-sm border-surface-200 group cursor-pointer hover:bg-surface-100"
    >
      <div className="flex items-center gap-2 min-w-0">
        {children}
      </div>
      {!disabled && (
        <span
          className={clsx(
            'p-1 border rounded-md bg-surface-50',
            folded ? 'group-hover:border-surface-300' : 'border-surface-400',
          )}
        >
          {folded ? <ChevronDown /> : <ChevronUp />}
        </span>
      )}
    </button>
  );
};
