import {
  autoUpdate,
  FloatingPortal,
  safePolygon,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from '@floating-ui/react';
import clsx from 'clsx';
import { Cloud, CloudOff } from 'icons';
import { useAtomValue } from 'jotai';
import { FC, useEffect, useState } from 'react';
import { Spinner } from 'ui';
import { connectionStateAtom } from '../../state/chat.atoms';
import { BaseUrlSelector } from './BaseUrlSelector';
import { ConnectionIndicatorClosed } from './ConnectionIndicatorClosed';
import { ConnectionIndicatorConnected } from './ConnectionIndicatorConnected';
import { ConnectionIndicatorConnecting } from './ConnectionIndicatorConnecting';

interface Props {
  className?: string;
}

export const ConnectionIndicatior: FC<Props> = ({ className = '' }) => {
  const connectionState = useAtomValue(connectionStateAtom);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const { x, y, strategy, refs, context } = useFloating({
    open: connectionState.type === 'CONNECTED' ? isPopoverOpen : true,
    strategy: 'fixed',
    placement: 'bottom-start',
    onOpenChange: setPopoverOpen,
    whileElementsMounted: autoUpdate,
  });
  useEffect(() => {
    setPopoverOpen(connectionState.type !== 'CONNECTED');
  }, [connectionState.type]);

  const click = useClick(context, {});

  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);
  return (
    <>
      <div className={className} ref={refs.setReference} {...getReferenceProps()}>
        {connectionState.type === 'CLOSED' && <CloudOff />}
        {connectionState.type === 'CONNECTING' && <Spinner />}
        {connectionState.type === 'CONNECTED' && <Cloud />}
      </div>
      {isPopoverOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
            {...getFloatingProps()}
            className={clsx(
              'border border-surface-400 bg-surface-100',
              'flex flex-col gap-4',
              'w-[max-content] px-4 py-4 rounded shadow-lg',
            )}
          >
            {connectionState.type === 'CONNECTED' && <ConnectionIndicatorConnected />}
            {connectionState.type === 'CONNECTING' && <ConnectionIndicatorConnecting />}
            {connectionState.type === 'CLOSED' && <ConnectionIndicatorClosed countdown={connectionState.countdown} />}
            <BaseUrlSelector />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
