import clsx from 'clsx';
import type { FC, ReactNode } from 'react';
import { stopPropagation } from '../../helper/browser';
import { useFocusPane, useIsFocused } from '../../state/panes';

interface Props {
  children: ReactNode;
  operators?: ReactNode;
  icon?: ReactNode;
}

export const PaneHeaderBox: FC<Props> = ({ children, operators, icon }) => {
  const isFocused = useIsFocused();
  const focus = useFocusPane();
  return (
    <div
      className={clsx(
        'bg-surface-100 flex items-center px-4 text-lg',
        'justify-between border-b-1/2 transition-colors duration-200',
        isFocused ? 'border-brand-600' : 'border-surface-300',
      )}
      onClick={focus}
    >
      <div className="inline-flex gap-1 items-center flex-nowrap whitespace-nowrap overflow-hidden">
        {icon}
        {children}
      </div>
      {operators && <div className="inline-flex gap-1 ml-2" onClick={stopPropagation}>{operators}</div>}
    </div>
  );
};
