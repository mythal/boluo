import type { Space } from 'api';
import clsx from 'clsx';
import { useMe } from 'common';
import { useAtom } from 'jotai';
import type { FC } from 'react';
import { useCallback, useMemo } from 'react';
import { toggle } from 'utils';
import { isSidebarExpandedAtom } from '../../state/ui.atoms';
import { Pane } from '../../types/chat-pane';
import { ConnectionIndicatior } from './ConnectionIndicator';
import { SidebarChannelList } from './SidebarChannelList';
import { SidebarHeader } from './SidebarHeader';
import { SpaceOptions } from './SidebarSpaceOptions';
import { SidebarUserOperations } from './SidebarUserOperations';
import { SidebarStateContext } from './useSidebarState';

interface Props {
  space: Space;
  className?: string;
  panes: Pane[];
}

export const Sidebar: FC<Props> = ({ space, panes, className }) => {
  const [isExpanded, setExpanded] = useAtom(isSidebarExpandedAtom);
  const me = useMe();
  const toggleExpanded = useCallback(() => setExpanded(toggle), [setExpanded]);
  const isSettingsOpen = useMemo(() => panes.findIndex(pane => pane.type === 'SETTINGS') !== -1, [panes]);
  const isHelpOpen = useMemo(() => panes.findIndex(pane => pane.type === 'HELP') !== -1, [panes]);
  const isLoginOpen = useMemo(() => panes.findIndex(pane => pane.type === 'LOGIN') !== -1, [panes]);
  const isProfileOpen = useMemo(() => {
    if (!me) return false;
    return panes.findIndex(pane => pane.type === 'PROFILE' && pane.userId === me.user.id) !== -1;
  }, [panes, me]);
  return (
    <SidebarStateContext.Provider value={{ isExpanded: isExpanded }}>
      <div className={className}>
        <SidebarHeader toggleExpand={toggleExpanded} />
        <div
          className={clsx(
            'bg-bg relative flex-grow flex flex-col justify-between overflow-hidden',
            isExpanded ? 'w-sidebar' : '',
          )}
        >
          {isExpanded
            ? (
              <div className="divide-y overflow-y-auto">
                <SpaceOptions space={space} panes={panes} />
                <SidebarChannelList panes={panes} spaceId={space.id} />
              </div>
            )
            : (
              <div className="flex flex-col items-center py-2">
                <ConnectionIndicatior className="p-2 border rounded cursor-pointer" />
              </div>
            )}

          <SidebarUserOperations
            isProfileOpen={isProfileOpen}
            isSettingsOpen={isSettingsOpen}
            isLoginOpen={isLoginOpen}
            isHelpOpen={isHelpOpen}
          />
        </div>
      </div>
    </SidebarStateContext.Provider>
  );
};
