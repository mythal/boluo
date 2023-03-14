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
  extra?: ReactNode;
}

export const PaneHeaderBox: FC<Props> = ({ children, operators, icon, extra }) => {
  const isFocused = useIsFocused();
  const paneBanner = usePaneBanner();
  return (
    <div className={paneBanner.content || extra ? '' : ''}>
      <div
        className={clsx(
          'min-h-pane-header bg-surface-100 flex items-center px-4 text-lg',
          'justify-between border-b transition-colors duration-100 ease-in-out',
          isFocused ? 'border-brand-600' : 'border-surface-300',
        )}
      >
        <div className="inline-flex gap-1 items-center flex-nowrap min-w-0">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="whitespace-nowrap overflow-hidden text-ellipsis flex-shrink">
            {children}
          </div>
        </div>
        {operators && <div className="inline-flex gap-1 ml-2" onClick={stopPropagation}>{operators}</div>}
      </div>

      <div className="divide-y">
        {paneBanner.content && <PaneBanner banner={paneBanner} />}
        {extra}
      </div>
    </div>
  );
};
