import { SidebarButton } from '@boluo/ui/chat/SidebarButton';
import { type FC, useMemo } from 'react';
import { isSidebarExpandedAtom, sidebarContentStateAtom } from '../../state/ui.atoms';
import { useAtom, useAtomValue } from 'jotai';
import { chatAtom, connectionStateAtom } from '../../state/chat.atoms';
import { selectAtom } from 'jotai/utils';

export const SidebarButtonController: FC = () => {
  const [isExpanded, setExpanded] = useAtom(isSidebarExpandedAtom);
  const inSpace = useAtomValue(
    useMemo(() => selectAtom(chatAtom, (chat) => chat.context.spaceId != ''), []),
  );
  const connectionState = useAtomValue(connectionStateAtom);
  const [sidebarState, setSidebarState] = useAtom(sidebarContentStateAtom);
  const disconnected = inSpace && connectionState.type !== 'CONNECTED';
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
