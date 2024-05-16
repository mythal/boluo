import clsx from 'clsx';
import { FC, ReactNode, useContext, useMemo } from 'react';
import { stopPropagation } from '@boluo/utils';
import { usePaneBanner } from '../hooks/useBanner';
import { PaneContext } from '../state/view.context';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBanner } from './PaneBanner';
import { Square } from '@boluo/icons';
import { atom, useAtomValue } from 'jotai';
import { panesAtom } from '../state/view.atoms';
import { SidebarButton } from './sidebar/SidebarButton';
import { isSidebarExpandedAtom } from '../state/ui.atoms';

interface Props {
  withoutDefaultOperators?: boolean;
  children: ReactNode;
  operators?: ReactNode;
  icon?: ReactNode;
  extra?: ReactNode;
}

export const PaneHeaderBox: FC<Props> = ({ children, operators, icon, extra, withoutDefaultOperators = false }) => {
  const { focused: isFocused, canClose, key } = useContext(PaneContext);
  const paneBanner = usePaneBanner();
  const defaultOperators: ReactNode = useMemo(() => {
    if (withoutDefaultOperators || canClose === false) return null;
    return <ClosePaneButton />;
  }, [withoutDefaultOperators, canClose]);
  icon = icon ?? <Square />;
  const showSidebarButton = useAtomValue(
    useMemo(
      () =>
        atom((read) => {
          const panes = read(panesAtom);
          const isSidebarExpanded = read(isSidebarExpandedAtom);
          if (isSidebarExpanded) return false;
          return panes.length > 0 && panes[0]!.key === key;
        }),
      [key],
    ),
  );
  const sidebarButton = useMemo(
    () => <div className="w-8">{showSidebarButton && <SidebarButton />}</div>,
    [showSidebarButton],
  );
  return (
    <div className="">
      <div className="min-h-pane-header bg-pane-header-bg flex items-center pr-[6px] text-sm">
        {sidebarButton}

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
