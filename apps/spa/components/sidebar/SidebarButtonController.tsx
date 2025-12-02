import { SidebarButton } from '@boluo/ui/chat/SidebarButton';
import { type FC, useEffect, useMemo, useState } from 'react';
import { isSidebarExpandedAtom, sidebarContentStateAtom } from '../../state/ui.atoms';
import { atom, useAtom, useStore } from 'jotai';
import { connectionStateAtom } from '../../state/chat.atoms';
import { routeAtom } from '../../state/view.atoms';

export const SidebarButtonController: FC = () => {
  const store = useStore();
  const [isExpanded, setExpanded] = useAtom(isSidebarExpandedAtom);
  const [sidebarState, setSidebarState] = useAtom(sidebarContentStateAtom);
  const [disconnected, setDisconnected] = useState(false);
  const disconnectedAtom = useMemo(() => {
    return atom((read) => {
      const route = read(routeAtom);
      const connection = read(connectionStateAtom);
      if (route.type === 'SPACE') {
        if (connection.type !== 'CONNECTED') {
          return true;
        }
      }
      return false;
    });
  }, []);

  useEffect(() => {
    return store.sub(disconnectedAtom, () => {
      setDisconnected(store.get(disconnectedAtom));
    });
  }, [store, disconnectedAtom]);
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
      switchToConnections={switchToConnections}
    />
  );
};
