import { type FC } from 'react';
import { FloatingPortal } from '@floating-ui/react';
import { PanelLeftClose, PanelLeftOpen } from '@boluo/icons';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { useIsTouch } from '@boluo/ui/hooks/useIsTouch';
import clsx from 'clsx';
import { TooltipBox } from '../TooltipBox';
import { FormattedMessage } from 'react-intl';
import { Kbd } from '../Kbd';
import { isApple } from '@boluo/utils/browser';

interface Props {
  isSidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
}

export const SidebarButton: FC<Props> = ({ isSidebarExpanded, setSidebarExpanded }) => {
  const isTouch = useIsTouch();

  const {
    showTooltip,
    refs: { setFloating, setReference },
    getFloatingProps,
    getReferenceProps,
    floatingStyles,
  } = useTooltip('bottom-start');
  return (
    <FloatingPortal>
      <button
        className={clsx(
          'fixed z-20 h-16 w-10 cursor-pointer rounded-lg',
          'focus:ring-border-focus focus:ring-2 focus:outline-none',
          isTouch
            ? 'bottom-[30%] -left-2 p-1'
            : [
                isSidebarExpanded ? 'left-[calc(var(--spacing-sidebar)-1.1rem)]' : '-left-2.5',
                'top-[20%] p-1.5',
              ],
        )}
        onClick={() => setSidebarExpanded((x) => !x)}
        ref={setReference}
        {...getReferenceProps()}
      >
        <div
          className={clsx(
            'sidebar-button-box bg-sidebar-bg text-text-primary flex h-full w-full items-center justify-center rounded-sm',
            isSidebarExpanded ? '' : 'shadow-xs',
          )}
        >
          {isSidebarExpanded ? <PanelLeftClose /> : <PanelLeftOpen />}
        </div>
      </button>
      <TooltipBox
        show={showTooltip}
        ref={setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
        className="dark rounded bg-black px-3 py-2 text-sm text-white shadow-lg"
      >
        <div className="pb-2">
          {isApple() ? <Kbd>⌘</Kbd> : <Kbd>Ctrl</Kbd>} + <Kbd>/</Kbd>
        </div>
        <div>
          <FormattedMessage defaultMessage="Toggle Sidebar" />
        </div>
      </TooltipBox>
    </FloatingPortal>
  );
};
