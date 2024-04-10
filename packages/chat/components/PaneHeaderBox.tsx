import clsx from 'clsx';
import { FC, ReactNode, useContext, useMemo } from 'react';
import { stopPropagation } from '@boluo/utils';
import { usePaneBanner } from '../hooks/useBanner';
import { PaneContext } from '../state/view.context';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBanner } from './PaneBanner';

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
  return (
    <div className={paneBanner.content || extra ? '' : ''}>
      <div
        className={clsx(
          'min-h-pane-header pl-pane flex items-center pr-4 text-lg',
          'border-surface-100 bg-pane-header justify-between border-b',
        )}
      >
        <div className="inline-flex min-w-0 flex-nowrap items-center gap-1">
          {icon && (
            <div className={clsx('flex-shrink-0', isFocused ? 'text-brand-700' : 'text-surface-300')}>{icon}</div>
          )}
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

      <div className="bg-lowest divide-surface-100 divide-y">
        {paneBanner.content && <PaneBanner banner={paneBanner} />}
        {extra}
      </div>
    </div>
  );
};
