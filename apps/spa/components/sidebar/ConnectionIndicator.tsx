import clsx from 'clsx';
import { Cloud, Unplug } from '@boluo/icons';
import { useAtom, useAtomValue } from 'jotai';
import { type FC, type ReactNode, useEffect, useRef } from 'react';
import { Spinner } from '@boluo/ui/Spinner';
import { connectionStateAtom } from '../../state/chat.atoms';
import { FormattedMessage } from 'react-intl';
import { useProxies } from '../../hooks/useProxies';
import { backendUrlConfigAtom } from '../../base-url';
import { backendUrlAtom } from '@boluo/api-browser';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { sidebarContentStateAtom } from '../../state/ui.atoms';

interface Props {
  spaceId: string | null | undefined;
}

export const ConnectionIndicatior: FC<Props> = ({ spaceId }) => {
  const connectionState = useAtomValue(connectionStateAtom);
  const [sidebarContentState, setSidebarContentState] = useAtom(sidebarContentStateAtom);
  const prevConnectStateType = useRef(connectionState.type);
  useEffect(() => {
    const prevType = prevConnectStateType.current;
    if (
      connectionState.type !== 'CONNECTED' &&
      connectionState.type !== 'ERROR' &&
      connectionState.retry >= 2 &&
      connectionState.type !== prevType &&
      !(prevType === 'CLOSED' && connectionState.type === 'CONNECTING')
    ) {
      setSidebarContentState((prev) => (prev === 'CONNECTIONS' ? prev : 'CONNECTIONS'));
    }
    prevConnectStateType.current = connectionState.type;
  }, [connectionState, setSidebarContentState]);
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
      icon = <Unplug />;
      break;
    case 'ERROR':
      icon = <Unplug />;
      break;
  }
  return (
    <>
      <div
        className={clsx(
          'ConnectionIndicatior group flex h-8 cursor-pointer items-center gap-1 px-4 py-1 text-sm select-none',
          connectionState.type === 'CONNECTED' ? 'bg-state-success-bg/50' : 'bg-surface-muted/50',
        )}
        onClick={() =>
          setSidebarContentState((prev) => (prev === 'CONNECTIONS' ? 'CHANNELS' : 'CONNECTIONS'))
        }
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
          <span className="shrink truncate">
            <FormattedMessage defaultMessage="Connected" />
            <span className="mx-1 text-xs">
              (<CurrentName />)
            </span>
          </span>
        )}
        <span className="grow" />
        <div className="w-max flex-none text-right">
          <ButtonInline groupHover aria-pressed={sidebarContentState === 'CONNECTIONS'}>
            <FormattedMessage defaultMessage="Switch" />
          </ButtonInline>
        </div>
      </div>
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
