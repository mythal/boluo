import {
  autoUpdate,
  FloatingPortal,
  safePolygon,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from '@floating-ui/react';
import clsx from 'clsx';
import { Cloud, CloudOff } from 'icons';
import { useAtomValue } from 'jotai';
import { FC, useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const connectionState = useAtomValue(connectionStateAtom);
  const { x, y, strategy, refs, context } = useFloating({
    open: connectionState.type === 'CONNECTED' ? isOpen : true,
    strategy: 'fixed',
    placement: 'bottom-start',
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    enabled: connectionState.type === 'CONNECTED',
    delay: {
      close: 1000,
    },
    handleClose: safePolygon(),
  });

  const dismiss = useDismiss(context, { enabled: connectionState.type === 'CONNECTED' });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    dismiss,
  ]);
  return (
    <>
      <div className={className} ref={refs.setReference} {...getReferenceProps()}>
        <button className="p-1">
          {connectionState.type === 'CLOSED' && <CloudOff />}
          {connectionState.type === 'CONNECTING' && <Spinner />}
          {connectionState.type === 'CONNECTED' && <Cloud />}
        </button>
      </div>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
            {...getFloatingProps()}
            className={clsx(
              'border border-surface-400 bg-surface-100',
              'flex flex-col gap-4',
              'w-[max-content] px-4 py-2 rounded shadow-lg',
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
