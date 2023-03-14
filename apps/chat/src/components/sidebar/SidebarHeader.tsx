import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'icons';
import type { FC } from 'react';
import { useSidebarState } from './useSidebarState';

interface Props {
  toggleExpand: () => void;
}

export const SidebarHeader: FC<Props> = ({ toggleExpand }) => {
  const { isExpanded } = useSidebarState();
  return (
    <div
      className={clsx(
        'h-pane-header border-b bg-surface-100 border-b-gray-400 flex justify-between gap-1 py-2 items-center select-none',
        isExpanded ? 'px-4' : 'px-3',
      )}
    >
      <button
        className={clsx(
          'w-8 h-8 border rounded-md  cursor-pointer flex items-center justify-center',
          isExpanded
            ? 'border-surface-400 bg-surface-200 hover:bg-surface-50'
            : 'border-surface-300 bg-surface-50 hover:bg-surface-200',
        )}
        onClick={toggleExpand}
      >
        {isExpanded ? <ChevronLeft /> : <ChevronRight />}
      </button>
    </div>
  );
};
