import { SidebarButton } from '@boluo/ui/chat/SidebarButton';
import { FC } from 'react';
import { isSidebarExpandedAtom, sidebarContentStateAtom } from '../../state/ui.atoms';
import { useAtom, useAtomValue } from 'jotai';
import { connectionStateAtom } from '../../state/chat.atoms';

export const SidebarButtonController: FC = () => {
  const [isExpanded, setExpanded] = useAtom(isSidebarExpandedAtom);
  const connectionState = useAtomValue(connectionStateAtom);
  const [sidebarState, setSidebarState] = useAtom(sidebarContentStateAtom);
  const disconnected = connectionState.type !== 'CONNECTED';
  return (
    <SidebarButton
      isSidebarExpanded={isExpanded}
      setSidebarExpanded={setExpanded}
      disconnected={disconnected}
      switchToConnections={
        sidebarState === 'CONNECTIONS'
          ? undefined
          : () => {
              setSidebarState('CONNECTIONS');
            }
      }
    />
  );
};
