import type { Space } from 'api';
import clsx from 'clsx';
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
  panes: Pane[];
}

export const ChatSiderbar: FC<Props> = ({ space, panes }) => {
  const [isExpand, setExpand] = useState(true);
  const toggleExpand = useCallback(() => setExpand(toggle), []);
  const isSettingsOpen = useMemo(() => panes.findIndex(pane => pane.type === 'SETTINGS') !== -1, [panes]);
  const isHelpOpen = useMemo(() => panes.findIndex(pane => pane.type === 'HELP') !== -1, [panes]);
  const isLoginOpen = useMemo(() => panes.findIndex(pane => pane.type === 'LOGIN') !== -1, [panes]);
  const [showUserOperations, setShowUserOperations] = useState(false);
  const handleClickUserIcon = useCallback(() => {
    setExpand(true);
    setShowUserOperations(true);
  }, []);
  const userIcon = useMemo(
    () => <SidebarUserIcon onClick={handleClickUserIcon} />,
    [handleClickUserIcon],
  );
  return (
    <>
      <SidebarHeader isExpand={isExpand} toggleExpand={toggleExpand} userIcon={userIcon} />
      <div
        className={clsx(
          'bg-bg relative flex flex-col justify-between overflow-y-auto row-start-2 row-end-[-1] col-start-1 col-end-1',
          isExpand ? 'w-48' : '',
        )}
      >
        {isExpand
          ? (
            <div>
              {showUserOperations && <SidebarUserOperations close={() => setShowUserOperations(false)} />}
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
            ? 'p-2 flex justify-between sticky bottom-0 bg-bg'
            : 'flex flex-col justify-center items-center gap-2 p-2'}
          isSettingsOpen={isSettingsOpen}
          isHelpOpen={isHelpOpen}
          isLoginOpen={isLoginOpen}
          isExpand={isExpand}
        />
      </div>
    </>
  );
};
