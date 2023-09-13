import {
  autoUpdate,
  FloatingPortal,
  offset,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import clsx from 'clsx';
import { Cloud, CloudOff } from 'icons';
import { useAtomValue } from 'jotai';
import { FC, Suspense, useEffect, useMemo, useState } from 'react';
import { Spinner } from 'ui/Spinner';
import { useSpace } from '../../hooks/useSpace';
import { connectionStateAtom } from '../../state/chat.atoms';
import { FloatingBox } from '../common/FloatingBox';
import { BaseUrlSelector } from './BaseUrlSelector';
import { ConnectionIndicatorClosed } from './ConnectionIndicatorClosed';
import { ConnectionIndicatorConnected } from './ConnectionIndicatorConnected';
import { ConnectionIndicatorConnecting } from './ConnectionIndicatorConnecting';

interface Props {
  className?: string;
}

export const ConnectionIndicatior: FC<Props> = ({ className = '' }) => {
  const space = useSpace();
  const connectionState = useAtomValue(connectionStateAtom);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const middleware = useMemo(() => [offset(-6)], []);
  const { x, y, strategy, refs, context } = useFloating({
    open: connectionState.type === 'CONNECTED' ? isPopoverOpen : true,
    strategy: 'fixed',
    placement: 'bottom-start',
    middleware,
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
  if (space == null) return null;
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
              'w-[max-content] z-40',
            )}
          >
            <FloatingBox>
              <div className="flex flex-col gap-4">
                {connectionState.type === 'CONNECTED' && <ConnectionIndicatorConnected />}
                {connectionState.type === 'CONNECTING' && <ConnectionIndicatorConnecting />}
                {connectionState.type === 'CLOSED' && (
                  <ConnectionIndicatorClosed countdown={connectionState.countdown} />
                )}
                <Suspense fallback="...">
                  <BaseUrlSelector />
                </Suspense>
              </div>
            </FloatingBox>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
