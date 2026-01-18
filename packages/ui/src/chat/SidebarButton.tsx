// False positive with useTooltip refs
/* eslint-disable react-hooks/refs */
import { type FC, type ReactNode } from 'react';
import ChevronLeft from '@boluo/icons/ChevronLeft';
import ChevronRight from '@boluo/icons/ChevronRight';
import AlertTriangle from '@boluo/icons/AlertTriangle';
import Unplug from '@boluo/icons/Unplug';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { useIsTouch } from '@boluo/ui/hooks/useIsTouch';
import clsx from 'clsx';
import { FormattedMessage } from 'react-intl';
import { Kbd } from '../Kbd';
import { isApple } from '@boluo/utils/browser';
import Icon from '../Icon';
import { ButtonInline } from '../ButtonInline';

interface SidebarButtonError {
  message: ReactNode;
  onRetry?: () => void;
}

interface Props {
  isSidebarExpanded: boolean;
  disconnected: boolean;
  error?: SidebarButtonError;
  setSidebarExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  switchToConnections?: () => void;
}

export const SidebarButton: FC<Props> = ({
  isSidebarExpanded,
  setSidebarExpanded,
  disconnected,
  error,
  switchToConnections,
}) => {
  const isTouch = useIsTouch();
  const placement = isTouch ? 'right-start' : 'bottom-start';
  const offset = isTouch ? 8 : 4;

  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip(
    placement,
    offset,
  );
  let icon = isSidebarExpanded ? <ChevronLeft /> : <ChevronRight />;
  if (disconnected && !isSidebarExpanded) {
    icon = (
      <span className="text-xs">
        <Icon icon={Unplug} />
      </span>
    );
  }
  return (
    <div
      className={clsx(
        'SidebarButton',
        'fixed z-20 h-16 w-8',
        isTouch
          ? 'bottom-[30%] -left-2'
          : [
              isSidebarExpanded ? 'left-[calc(var(--spacing-sidebar)-0.375rem)]' : '-left-1',
              'top-[20%]',
            ],
      )}
      ref={refs.setReference}
      {...getReferenceProps()}
    >
      <button
        className={clsx(
          'h-16 w-8 cursor-pointer rounded-lg',
          'focus:ring-border-focus focus:ring-2 focus:outline-none',
          isTouch ? 'p-1' : 'p-1.5',
        )}
        onClick={() => setSidebarExpanded((x) => !x)}
      >
        <div
          className={clsx(
            isTouch
              ? 'bg-surface-floating border-border-strong border-t border-r border-b shadow-lg'
              : 'bg-sidebar-bg',
            'sidebar-button-box text-text-primary flex h-full w-full items-center justify-center rounded-r-sm',
            isSidebarExpanded
              ? 'border-sidebar-border border-t border-r border-b'
              : !isTouch && 'shadow-xs',
          )}
        >
          {icon}
        </div>
      </button>

      {showTooltip && !disconnected && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="dark w-max rounded bg-black px-3 py-2 text-left text-sm text-white shadow-lg"
        >
          <div className="pb-2">
            {isApple() ? <Kbd>⌘</Kbd> : <Kbd>Ctrl</Kbd>} + <Kbd>/</Kbd>
          </div>
          <div>
            <FormattedMessage defaultMessage="Toggle Sidebar" />
          </div>
        </div>
      )}
      {error && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="dark text-text-primary w-max max-w-xs rounded border border-black bg-black px-3 py-2 text-left text-sm shadow-lg"
        >
          {error.onRetry && (
            <div className="float-right ml-2">
              <ButtonInline onClick={error.onRetry}>
                <FormattedMessage defaultMessage="Retry" />
              </ButtonInline>
            </div>
          )}
          <Icon icon={AlertTriangle} /> <span>{error.message}</span>
        </div>
      )}
      {disconnected && !error && (
        <button
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          onClick={switchToConnections}
          className="dark w-max cursor-pointer rounded border border-black bg-black px-1 py-2 text-left text-sm text-white shadow-lg hover:bg-neutral-900"
        >
          <div className="text-vertical">
            <FormattedMessage defaultMessage="Offline" />
            {switchToConnections && (
              <span className="text-text-secondary">
                {' '}
                (<FormattedMessage defaultMessage="Click to view" />)
              </span>
            )}
          </div>
        </button>
      )}
    </div>
  );
};
