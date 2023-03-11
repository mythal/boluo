import clsx from 'clsx';
import { FC, ReactNode } from 'react';
import { stopPropagation } from 'utils';
import { usePaneBanner, useSetBanner } from '../hooks/useBanner';
import { useFocusPane, useIsFocused } from '../state/chat-view';
import { PaneBanner } from './PaneBanner';

interface Props {
  children: ReactNode;
  operators?: ReactNode;
  icon?: ReactNode;
}

export const PaneHeaderBox: FC<Props> = ({ children, operators, icon }) => {
  const isFocused = useIsFocused();
  const paneBanner = usePaneBanner();
  return (
    <div
      className={clsx(
        'relative min-h-pane-header bg-surface-100 flex items-center px-4 text-lg',
        'justify-between border-b-1/2 transition-colors duration-200',
        isFocused ? 'border-brand-600' : 'border-surface-300',
      )}
    >
      <div className="inline-flex gap-1 items-center flex-nowrap whitespace-nowrap overflow-hidden">
        {icon}
        {children}
      </div>
      {operators && <div className="inline-flex gap-1 ml-2" onClick={stopPropagation}>{operators}</div>}
      {paneBanner.content && <PaneBanner banner={paneBanner} />}
    </div>
  );
};
