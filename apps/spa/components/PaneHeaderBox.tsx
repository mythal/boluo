import clsx from 'clsx';
import { FC, ReactNode, useContext, useMemo } from 'react';
import { stopPropagation } from '@boluo/utils';
import { usePaneBanner } from '../hooks/useBanner';
import { PaneContext } from '../state/view.context';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBanner } from './PaneBanner';
import { PanelLeftClose, PanelLeftOpen, Square } from '@boluo/icons';
import { atom, useAtom, useAtomValue } from 'jotai';
import { isSidebarExpandedAtom } from '../state/ui.atoms';
import { panesAtom } from '../state/view.atoms';
import { useTooltip } from '../hooks/useTooltip';
import { TooltipBox } from './common/TooltipBox';
import { FormattedMessage } from 'react-intl';

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
  const isFirstPane = useAtomValue(
    useMemo(
      () =>
        atom((read) => {
          const panes = read(panesAtom);
          return panes.length > 0 && panes[0]!.key === key;
        }),
      [key],
    ),
  );
  const sidebarButton = useMemo(
    () => <div className="w-8 px-1">{isFirstPane && <PaneHeaderSidebarButton />}</div>,
    [isFirstPane],
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

const PaneHeaderSidebarButton: FC = ({}) => {
  const [isSidebarExpanded, setSidebarExpanded] = useAtom(isSidebarExpandedAtom);

  const { showTooltip, refs, getFloatingProps, getReferenceProps, dismiss, floatingStyles } =
    useTooltip('bottom-start');

  return (
    <>
      <button
        aria-pressed={isSidebarExpanded}
        className={clsx(
          'inline-flex h-6 w-6 items-center justify-center rounded px-1 py-1 aria-pressed:shadow-inner',
          isSidebarExpanded ? 'bg-switch-pressed-bg text-switch-pressed-text' : 'hover:bg-switch-hover-bg',
        )}
        onClick={(e) => {
          e.stopPropagation();
          setSidebarExpanded((x) => !x);
          dismiss();
        }}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {isSidebarExpanded ? <PanelLeftClose /> : <PanelLeftOpen />}
      </button>
      <TooltipBox show={showTooltip} ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} defaultStyle>
        <FormattedMessage defaultMessage="Toggle Sidebar" />
      </TooltipBox>
    </>
  );
};
