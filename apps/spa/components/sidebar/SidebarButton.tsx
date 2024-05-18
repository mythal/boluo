import { useAtom } from 'jotai';
import { FC } from 'react';
import { FloatingPortal } from '@floating-ui/react';
import { PanelLeftClose, PanelLeftOpen } from '@boluo/icons';
import { isSidebarExpandedAtom } from '../../state/ui.atoms';
import { useIsTouch } from '../../hooks/useIsTouch';
import clsx from 'clsx';
import { useTooltip } from '../../hooks/useTooltip';
import { TooltipBox } from '../common/TooltipBox';
import { FormattedMessage } from 'react-intl';
import { Kbd } from '@boluo/ui/Kbd';
import { isApple } from '@boluo/utils';

export const SidebarButton: FC = () => {
  const isTouch = useIsTouch();
  const [isSidebarExpanded, setSidebarExpanded] = useAtom(isSidebarExpandedAtom);

  const { showTooltip, refs, getFloatingProps, getReferenceProps, dismiss, floatingStyles } =
    useTooltip('bottom-start');
  return (
    <FloatingPortal>
      <button
        className={clsx(
          'fixed z-20 h-10 w-10',
          isTouch
            ? '-left-2 bottom-[30%] p-1'
            : [isSidebarExpanded ? 'left-[15rem]' : '-left-[10px]', 'top-[20%] p-1.5'],
        )}
        onClick={() => setSidebarExpanded((x) => !x)}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <div className="bg-sidebar-float-bg text-sidebar-float-text flex h-full w-full items-center justify-center rounded-sm shadow">
          {isSidebarExpanded ? <PanelLeftClose /> : <PanelLeftOpen />}
        </div>
      </button>
      <TooltipBox
        show={showTooltip}
        ref={refs.setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
        className="rounded bg-black px-3 py-2 text-sm text-white shadow-lg"
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
