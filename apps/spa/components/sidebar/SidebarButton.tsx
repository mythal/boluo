import { useAtom } from 'jotai';
import { FC } from 'react';
import { isSidebarExpandedAtom } from '../../state/ui.atoms';
import { useTooltip } from '../../hooks/useTooltip';
import clsx from 'clsx';
import { PanelLeftClose, PanelLeftOpen } from '@boluo/icons';
import { TooltipBox } from '../common/TooltipBox';
import { FormattedMessage } from 'react-intl';

export const SidebarButton: FC = ({}) => {
  const [isSidebarExpanded, setSidebarExpanded] = useAtom(isSidebarExpandedAtom);

  const { showTooltip, refs, getFloatingProps, getReferenceProps, dismiss, floatingStyles } =
    useTooltip('bottom-start');

  return (
    <>
      <button
        aria-pressed={isSidebarExpanded}
        className="group p-1"
        onClick={(e) => {
          e.stopPropagation();
          setSidebarExpanded((x) => !x);
          dismiss();
        }}
      >
        <span
          className={clsx(
            'inline-flex h-6 w-6 items-center justify-center rounded-sm',
            isSidebarExpanded
              ? 'bg-switch-pressed-bg text-switch-pressed-text shadow-inner'
              : 'text-text-lighter group-hover:text-text-base group-hover:bg-switch-hover-bg',
          )}
          ref={refs.setReference}
          {...getReferenceProps()}
        >
          {isSidebarExpanded ? <PanelLeftClose /> : <PanelLeftOpen />}
        </span>
      </button>
      <TooltipBox show={showTooltip} ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} defaultStyle>
        <FormattedMessage defaultMessage="Toggle Sidebar" />
      </TooltipBox>
    </>
  );
};
