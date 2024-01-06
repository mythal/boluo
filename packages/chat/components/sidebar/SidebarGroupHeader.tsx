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
      className="text-surface-600 border-surface-100 group flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2"
    >
      <div className="flex min-w-0 items-center gap-2 text-left text-base">{children}</div>
      {!disabled && (
        <span
          className={clsx(
            'bg-surface-50 group-hover:border-surface-500 group-hover:bg-surface-100 inline-flex h-8 w-8 flex-none items-center justify-center rounded-md border text-sm',
            folded ? '' : 'border-surface-400',
          )}
        >
          {Icon == null ? folded ? <ChevronDown /> : <ChevronUp /> : <Icon />}
        </span>
      )}
    </button>
  );
};
