import type { Space } from 'api';
import clsx from 'clsx';
import { useMe } from 'common';
import { useAtom } from 'jotai';
import type { FC } from 'react';
import { useCallback } from 'react';
import { toggle } from 'utils';
import { isSidebarExpandedAtom } from '../../state/ui.atoms';
import { ConnectionIndicatior } from './ConnectionIndicator';
import { SidebarChannelList } from './SidebarChannelList';
import { SidebarHeader } from './SidebarHeader';
import { SpaceOptions } from './SidebarSpaceOptions';
import { SidebarUserOperations } from './SidebarUserOperations';
import { SidebarStateContext } from './useSidebarState';

interface Props {
  space: Space;
  className?: string;
}

export const Sidebar: FC<Props> = ({ space, className }) => {
  const [isExpanded, setExpanded] = useAtom(isSidebarExpandedAtom);
  const me = useMe();
  const toggleExpanded = useCallback(() => setExpanded(toggle), [setExpanded]);
  return (
    <SidebarStateContext.Provider value={{ isExpanded: isExpanded }}>
      <div className={className}>
        <SidebarHeader toggleExpand={toggleExpanded} />
        <div
          className={clsx(
            'relative flex-grow flex flex-col justify-between overflow-hidden',
            isExpanded ? 'w-sidebar' : '',
          )}
        >
          {isExpanded
            ? (
              <div className="divide-y overflow-y-auto overflow-x-hidden">
                <SpaceOptions space={space} />
                <SidebarChannelList spaceId={space.id} />
              </div>
            )
            : (
              <div className="flex flex-col items-center py-2">
                <ConnectionIndicatior className="p-2 border rounded cursor-pointer" />
              </div>
            )}

          <SidebarUserOperations />
        </div>
      </div>
    </SidebarStateContext.Provider>
  );
};
