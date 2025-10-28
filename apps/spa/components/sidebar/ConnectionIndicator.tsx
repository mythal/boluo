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
import { Cloud, CloudOff } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import { type FC, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@boluo/ui/Spinner';
import { connectionStateAtom } from '../../state/chat.atoms';
import { FormattedMessage } from 'react-intl';
import { BaseUrlSelectionPanel } from './BaseUrlSelectionPanel';
import { useProxies } from '../../hooks/useProxies';
import { backendUrlConfigAtom } from '../../base-url';
import { backendUrlAtom } from '@boluo/api-browser';

interface Props {
  spaceId: string | null | undefined;
}

export const ConnectionIndicatior: FC<Props> = ({ spaceId }) => {
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
  const prevConnectStateType = useRef(connectionState.type);
  useEffect(() => {
    setPopoverOpen((prev) => {
      if (connectionState.type === 'CONNECTED' || connectionState.type === 'ERROR') return prev;
      if (connectionState.retry < 2) return prev;
      if (connectionState.type === prevConnectStateType.current) return prev;
      if (prevConnectStateType.current === 'CLOSED' && connectionState.type === 'CONNECTING')
        return prev;
      return true;
    });
    prevConnectStateType.current = connectionState.type;
  }, [connectionState]);

  const click = useClick(context, {});

  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  if (spaceId == null) return null;
  let icon: ReactNode;
  switch (connectionState.type) {
    case 'CONNECTED':
      icon = <Cloud />;
      break;
    case 'CONNECTING':
      icon = <Spinner />;
      break;
    case 'CLOSED':
      icon = <CloudOff />;
      break;
    case 'ERROR':
      icon = <CloudOff />;
      break;
  }
  return (
    <>
      <div
        className={clsx(
          'ConnectionIndicatior group flex cursor-pointer items-center gap-1 px-4 py-1 text-sm select-none',
          connectionState.type === 'CONNECTED' ? 'bg-connect-success' : 'bg-connect-other',
        )}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {icon}
        {connectionState.type === 'CLOSED' && (
          <span>
            <FormattedMessage defaultMessage="Offline" />
          </span>
        )}
        {connectionState.type === 'ERROR' && (
          <span>
            <FormattedMessage defaultMessage="Error" />
          </span>
        )}
        {connectionState.type === 'CONNECTING' && <span>…</span>}
        {connectionState.type === 'CONNECTED' && (
          <span className="">
            <FormattedMessage defaultMessage="Connected" />
            <span className="mx-1 text-xs">
              (<CurrentName />)
            </span>
          </span>
        )}
        <div className="grow text-right">
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
            <BaseUrlSelectionPanel connectionState={connectionState} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export const CurrentName: FC = () => {
  const proxies = useProxies();
  const backendUrlConfig = useAtomValue(backendUrlConfigAtom);
  const backendUrl = useAtomValue(backendUrlAtom);
  if (backendUrlConfig === 'auto') {
    return (
      <span>
        <FormattedMessage defaultMessage="Auto" />
      </span>
    );
  }
  const current = proxies.find((proxy) => proxy.url === backendUrl);
  if (!current) {
    return <span>...</span>;
  }
  return <span>{current.name}</span>;
};
