import clsx from 'clsx';
import { type FC, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { stopPropagation } from '@boluo/utils/browser';
import { usePaneBanner, useSetBanner } from '../hooks/useBanner';
import { PaneContext } from '../state/view.context';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBanner } from '@boluo/ui/PaneBanner';
import Square from '@boluo/icons/Square';
import { PaneDragHandle } from './PaneDragHandle';

interface Props {
  withoutDefaultOperators?: boolean;
  children: ReactNode;
  operators?: ReactNode;
  icon?: ReactNode;
  extra?: ReactNode;
}

export const PaneHeaderBox: FC<Props> = ({
  children,
  operators,
  icon,
  extra,
  withoutDefaultOperators = false,
}) => {
  const { focused: isFocused, canClose } = useContext(PaneContext);
  const paneBanner = usePaneBanner();
  const setBanner = useSetBanner();
  const dismissBanner = useCallback(() => setBanner(null), [setBanner]);
  const defaultOperators: ReactNode = useMemo(() => {
    if (withoutDefaultOperators || canClose === false) return null;
    return <ClosePaneButton />;
  }, [withoutDefaultOperators, canClose]);
  icon = icon ?? <Square />;
  const dragHandle = useMemo(() => <PaneDragHandle />, []);
  return (
    <div className="PaneHeaderBox">
      <div className="min-h-pane-header bg-pane-header-bg pl-pane relative flex items-center pr-1.5 text-sm">
        {dragHandle}
        <span
          className={clsx(
            'inline-flex shrink-0 items-center justify-center pr-1',
            isFocused ? 'text-text-muted' : 'text-text-muted/50',
          )}
        >
          {icon}
        </span>
        <div className="inline-flex min-w-0 grow flex-nowrap items-center">
          <div
            className={clsx(
              'shrink overflow-hidden text-ellipsis whitespace-nowrap',
              isFocused ? 'text-text-primary' : 'text-text-subtle',
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
        {paneBanner.content && <PaneBanner onDismiss={dismissBanner} banner={paneBanner} />}
        {extra}
      </div>
    </div>
  );
};
