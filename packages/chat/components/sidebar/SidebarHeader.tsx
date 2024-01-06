import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'icons';
import type { FC } from 'react';
import { ConnectionIndicatior } from './ConnectionIndicator';
import { useSidebarState } from './useSidebarState';

interface Props {
  toggleExpand: () => void;
}

export const SidebarHeader: FC<Props> = ({ toggleExpand }) => {
  const { isExpanded } = useSidebarState();
  return (
    <div className={clsx('h-pane-header flex select-none items-center justify-between gap-1 px-3 py-2')}>
      <button
        className={clsx(
          'flex h-8 w-8 cursor-pointer  items-center justify-center rounded-md border',
          isExpanded
            ? 'border-surface-400 bg-surface-200 hover:bg-surface-50'
            : 'border-surface-300 bg-surface-50 hover:bg-surface-200',
        )}
        onClick={toggleExpand}
      >
        {isExpanded ? <ChevronLeft /> : <ChevronRight />}
      </button>
      <ConnectionIndicatior className="bg-surface-50 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border" />
    </div>
  );
};
