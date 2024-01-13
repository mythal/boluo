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
import { FormattedMessage } from 'react-intl';

interface Props {}

export const ConnectionIndicatior: FC<Props> = ({}) => {
  const space = useSpace();
  const connectionState = useAtomValue(connectionStateAtom);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const middleware = useMemo(() => [offset(-32)], []);
  const { x, y, strategy, refs, context } = useFloating({
    open: connectionState.type === 'CONNECTED' ? isPopoverOpen : true,
    strategy: 'fixed',
    placement: 'right-end',
    middleware,
    onOpenChange: setPopoverOpen,
    whileElementsMounted: autoUpdate,
  });
  useEffect(() => {
    setPopoverOpen(connectionState.type !== 'CONNECTED');
  }, [connectionState.type]);

  const click = useClick(context, {});

  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  if (space == null) return null;
  return (
    <>
      <div
        className={clsx(
          'group flex cursor-pointer select-none items-center gap-1 px-3 py-1 text-sm',
          connectionState.type === 'CONNECTED' ? 'bg-connect-success' : 'bg-surface-300',
        )}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {connectionState.type === 'CLOSED' && (
          <>
            <CloudOff />
            <span>
              <FormattedMessage defaultMessage="Offline" />
            </span>
          </>
        )}
        {connectionState.type === 'CONNECTING' && (
          <>
            <Spinner />
            <span>…</span>
          </>
        )}
        {connectionState.type === 'CONNECTED' && (
          <>
            <Cloud />
            <span className="">
              <FormattedMessage defaultMessage="Connected" />
            </span>
          </>
        )}
        <div className="flex-grow text-right">
          <span className="rounded border bg-white/15 px-1 text-xs group-hover:bg-white/5">
            <FormattedMessage defaultMessage="Switch" />
          </span>
        </div>
      </div>
      {isPopoverOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
            {...getFloatingProps()}
            className={clsx('z-40 w-[max-content]')}
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
