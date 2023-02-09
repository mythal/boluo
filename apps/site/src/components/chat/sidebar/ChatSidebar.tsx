import type { Space } from 'boluo-api';
import { ChevronLeft, ChevronRight } from 'boluo-icons';
import clsx from 'clsx';
import type { FC } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import { useMemo } from 'react';
import { toggle } from '../../../helper/function';
import type { Pane } from '../../../types/ChatPane';
import { ChatSidebarFooter } from './ChatSidebarFooter';
import { SidebarChannelList } from './SidebarChannelList';
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
  return (
    <>
      <div className="border-b-1/2 bg-surface-100 border-b-gray-400 flex justify-between gap-1 py-2 px-4 items-center select-none">
        <button
          className={clsx(
            'p-2 border rounded-md  cursor-pointer ',
            isExpand
              ? 'border-surface-400 bg-surface-200 hover:bg-surface-50'
              : 'border-surface-300 bg-surface-50 hover:bg-surface-200',
          )}
          onClick={toggleExpand}
        >
          {isExpand ? <ChevronLeft /> : <ChevronRight />}
        </button>
      </div>
      <div
        className={clsx(
          'bg-bg relative flex flex-col justify-between overflow-y-auto row-start-2 row-end-[-1] col-start-1 col-end-1',
          isExpand ? 'w-48' : '',
        )}
      >
        {isExpand
          ? (
            <div>
              <SpaceOptions space={space} panes={panes} />
              <SidebarChannelList panes={panes} spaceId={space.id} />
            </div>
          )
          : <div />}
        <ChatSidebarFooter
          className={isExpand
            ? 'p-2 flex justify-between sticky bottom-0 bg-bg'
            : 'flex flex-col justify-center items-center gap-2 p-2'}
          isSettingsOpen={isSettingsOpen}
          isHelpOpen={isHelpOpen}
          isExpand={isExpand}
        />
      </div>
    </>
  );
};
