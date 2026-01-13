import { SidebarButton } from '@boluo/ui/chat/SidebarButton';
import { type FC, useCallback, useMemo } from 'react';
import { isSidebarExpandedAtom, sidebarContentStateAtom } from '../../state/ui.atoms';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { chatAtom, connectionStateAtom } from '../../state/chat.atoms';
import { routeAtom } from '../../state/view.atoms';
import { useIntl } from 'react-intl';

export const SidebarButtonController: FC = () => {
  const [isExpanded, setExpanded] = useAtom(isSidebarExpandedAtom);
  const [sidebarState, setSidebarState] = useAtom(sidebarContentStateAtom);
  const connectionState = useAtomValue(connectionStateAtom);
  const route = useAtomValue(routeAtom);
  const dispatch = useSetAtom(chatAtom);
  const intl = useIntl();
  const disconnected = route.type === 'SPACE' && connectionState.type !== 'CONNECTED';
  const errorMessage = useMemo(() => {
    if (route.type !== 'SPACE' || connectionState.type !== 'ERROR') {
      return null;
    }
    switch (connectionState.code) {
      case 'UNAUTHENTICATED':
        return intl.formatMessage({ defaultMessage: 'Please log in to continue.' });
      case 'NO_PERMISSION':
        return intl.formatMessage({
          defaultMessage: 'You do not have permission to access.',
        });
      case 'NETWORK_ERROR':
        return intl.formatMessage({ defaultMessage: 'Network error. Please retry.' });
      case 'INVALID_TOKEN':
        return intl.formatMessage({ defaultMessage: 'Invalid token. Please retry.' });
      default:
        return intl.formatMessage({
          defaultMessage: 'An unknown error occurred. Please refresh.',
        });
    }
  }, [connectionState, intl, route.type]);
  const handleRetry = useCallback(() => {
    if (route.type !== 'SPACE') return;
    dispatch({ type: 'retryConnection', payload: { mailboxId: route.spaceId } });
  }, [dispatch, route]);
  const switchToConnections = useMemo(() => {
    if (sidebarState === 'CONNECTIONS') {
      return undefined;
    }
    return () => {
      setSidebarState('CONNECTIONS');
    };
  }, [setSidebarState, sidebarState]);
  return (
    <SidebarButton
      isSidebarExpanded={isExpanded}
      setSidebarExpanded={setExpanded}
      disconnected={disconnected}
      error={errorMessage ? { message: errorMessage, onRetry: handleRetry } : undefined}
      switchToConnections={switchToConnections}
    />
  );
};
