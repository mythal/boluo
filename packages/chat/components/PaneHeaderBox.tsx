import clsx from 'clsx';
import { FC, ReactNode, useContext, useMemo } from 'react';
import { stopPropagation } from 'utils';
import { usePaneBanner } from '../hooks/useBanner';
import { usePaneIsFocus } from '../hooks/usePaneIsFocus';
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

export const PaneHeaderBox: FC<Props> = (
  { children, operators, icon, extra, withoutDefaultOperators = false },
) => {
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
          'min-h-pane-header flex items-center px-4 text-lg',
          'justify-between border-b border-surface-200',
          isFocused ? 'bg-surface-50' : 'bg-surface-50',
        )}
      >
        <div className="inline-flex gap-1 items-center flex-nowrap min-w-0">
          <div className={clsx('flex-shrink-0', isFocused ? 'text-brand-700' : 'text-surface-300')}>
            {icon}
          </div>
          <div
            className={clsx(
              'whitespace-nowrap overflow-hidden text-ellipsis flex-shrink',
              isFocused ? 'text-surface-950' : 'text-surface-400',
            )}
          >
            {children}
          </div>
        </div>
        {(operators != null || defaultOperators != null) && (
          <div className="inline-flex flex-none gap-1 ml-2" onClick={stopPropagation}>
            {operators}
            {defaultOperators}
          </div>
        )}
      </div>

      <div className="divide-y">
        {paneBanner.content && <PaneBanner banner={paneBanner} />}
        {extra}
      </div>
    </div>
  );
};
