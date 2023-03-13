import type { Space } from 'api';
import clsx from 'clsx';
import { useMe } from 'common';
import type { FC } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import { useMemo } from 'react';
import { toggle } from 'utils';
import type { Pane } from '../../types/chat-pane';
import { ChatSidebarFooter } from './ChatSidebarFooter';
import { SidebarChannelList } from './SidebarChannelList';
import { SidebarHeader } from './SidebarHeader';
import { SidebarUserIcon } from './SidebarUserIcon';
import { SidebarUserOperations } from './SidebarUserOperations';
import { SpaceOptions } from './SpaceOptions';

interface Props {
  space: Space;
  className?: string;
  panes: Pane[];
}

export const ChatSiderbar: FC<Props> = ({ space, panes, className }) => {
  const [isExpand, setExpand] = useState(true);
  const me = useMe();
  const toggleExpand = useCallback(() => setExpand(toggle), []);
  const isSettingsOpen = useMemo(() => panes.findIndex(pane => pane.type === 'SETTINGS') !== -1, [panes]);
  const isHelpOpen = useMemo(() => panes.findIndex(pane => pane.type === 'HELP') !== -1, [panes]);
  const isLoginOpen = useMemo(() => panes.findIndex(pane => pane.type === 'LOGIN') !== -1, [panes]);
  const isProfileOpen = useMemo(() => {
    if (!me) return false;
    return panes.findIndex(pane => pane.type === 'PROFILE' && pane.userId === me.user.id) !== -1;
  }, [panes, me]);
  const [showUserOperations, setShowUserOperations] = useState(false);
  const handleClickUserIcon = useCallback(() => {
    setExpand(true);
    setShowUserOperations(true);
  }, []);
  const userIcon = useMemo(
    () => (
      <SidebarUserIcon
        isUserOperationOpen={isExpand && showUserOperations}
        onClick={handleClickUserIcon}
        isLoginOpen={isLoginOpen}
      />
    ),
    [handleClickUserIcon, isExpand, isLoginOpen, showUserOperations],
  );
  return (
    <div className={className}>
      <SidebarHeader isExpand={isExpand} toggleExpand={toggleExpand} userIcon={userIcon} />
      <div
        className={clsx(
          'bg-bg relative flex-grow flex flex-col justify-between overflow-y-auto',
          isExpand ? 'w-sidebar' : '',
        )}
      >
        {isExpand
          ? (
            <div className="divide-y">
              {showUserOperations && (
                <SidebarUserOperations
                  isProfileOpen={isProfileOpen}
                  close={() => setShowUserOperations(false)}
                />
              )}
              <SpaceOptions space={space} panes={panes} />
              <SidebarChannelList panes={panes} spaceId={space.id} />
            </div>
          )
          : (
            <div className="flex justify-center py-4">
              {userIcon}
            </div>
          )}
        <ChatSidebarFooter
          className={isExpand
            ? 'p-2 px-4 flex justify-between sticky bottom-0 bg-bg'
            : 'flex flex-col justify-center items-center gap-2 p-2'}
          isSettingsOpen={isSettingsOpen}
          isHelpOpen={isHelpOpen}
          isLoginOpen={isLoginOpen}
          isExpand={isExpand}
        />
      </div>
    </div>
  );
};
