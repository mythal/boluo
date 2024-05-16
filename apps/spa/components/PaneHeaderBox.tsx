import clsx from 'clsx';
import { FC, ReactNode, useContext, useMemo } from 'react';
import { stopPropagation } from '@boluo/utils';
import { usePaneBanner } from '../hooks/useBanner';
import { PaneContext } from '../state/view.context';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBanner } from './PaneBanner';
import { Square } from '@boluo/icons';

interface Props {
  withoutDefaultOperators?: boolean;
  children: ReactNode;
  operators?: ReactNode;
  icon?: ReactNode;
  extra?: ReactNode;
}

export const PaneHeaderBox: FC<Props> = ({ children, operators, icon, extra, withoutDefaultOperators = false }) => {
  const { focused: isFocused, canClose } = useContext(PaneContext);
  const paneBanner = usePaneBanner();
  const defaultOperators: ReactNode = useMemo(() => {
    if (withoutDefaultOperators || canClose === false) return null;
    return <ClosePaneButton />;
  }, [withoutDefaultOperators, canClose]);
  icon = icon ?? <Square />;
  return (
    <div className="">
      <div className="min-h-pane-header pl-pane bg-pane-header-bg flex items-center pr-[6px] text-sm">
        <span
          className={clsx(
            'inline-flex flex-shrink-0 items-center justify-center pr-1',
            isFocused ? 'text-text-lighter' : 'text-text-lighter/50',
          )}
        >
          {icon}
        </span>
        <div className="inline-flex min-w-0 flex-grow flex-nowrap items-center">
          <div
            className={clsx(
              'flex-shrink overflow-hidden text-ellipsis whitespace-nowrap',
              isFocused ? 'text-surface-950' : 'text-surface-400',
            )}
          >
            {children}
          </div>
        </div>
        {(operators != null || defaultOperators != null) && (
          <div className="ml-2 inline-flex flex-none gap-1" onClick={stopPropagation}>
            {operators}
            {defaultOperators}
          </div>
        )}
      </div>

      <div className="">
        {paneBanner.content && <PaneBanner banner={paneBanner} />}
        {extra}
      </div>
    </div>
  );
};
