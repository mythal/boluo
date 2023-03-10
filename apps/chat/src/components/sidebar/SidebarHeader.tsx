import clsx from 'clsx';
import { useMe } from 'common';
import { ChevronLeft, ChevronRight } from 'icons';
import type { FC } from 'react';
import { Avatar } from '../account/Avatar';

interface Props {
  isExpand: boolean;
  toggleExpand: () => void;
}

export const SidebarHeader: FC<Props> = ({ isExpand, toggleExpand }) => {
  const me = useMe();
  return (
    <div className="border-b-1/2 bg-surface-100 border-b-gray-400 flex justify-between gap-1 py-2 px-4 items-center select-none">
      <button
        className={clsx(
          'w-8 h-8 border rounded-md  cursor-pointer flex items-center justify-center',
          isExpand
            ? 'border-surface-400 bg-surface-200 hover:bg-surface-50'
            : 'border-surface-300 bg-surface-50 hover:bg-surface-200',
        )}
        onClick={toggleExpand}
      >
        {isExpand ? <ChevronLeft /> : <ChevronRight />}
      </button>
      {me && isExpand && <Avatar size={32} id={me.user.id} className="rounded" />}
    </div>
  );
};
