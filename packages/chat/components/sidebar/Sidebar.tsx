import clsx from 'clsx';
import { useMe } from 'common';
import { useAtom, useAtomValue } from 'jotai';
import type { FC } from 'react';
import { useCallback } from 'react';
import { toggle } from 'utils';
import { useSpace } from '../../hooks/useSpace';
import { isSidebarExpandedAtom, sidebarContentStateAtom } from '../../state/ui.atoms';
import { ConnectionIndicatior } from './ConnectionIndicator';
import { SidebarChannelList } from './SidebarChannelList';
import { SidebarHeader } from './SidebarHeader';
import { SidebarSpaceList } from './SidebarSpaceList';
import { SpaceOptions } from './SidebarSpaceOptions';
import { SidebarUserOperations } from './SidebarUserOperations';
import { SidebarStateContext } from './useSidebarState';

interface Props {
  className?: string;
}

const ExpandedSidebarContent: FC = () => {
  const space = useSpace();
  const contentState = useAtomValue(sidebarContentStateAtom);
  const me = useMe();
  if (space == null) {
    if (me == null || me === 'LOADING') {
      return null;
    }
    return <SidebarSpaceList />;
  }
  return (
    <>
      <SpaceOptions space={space} />
      {contentState === 'CHANNELS' && <SidebarChannelList spaceId={space.id} />}
      {contentState === 'SPACES' && <SidebarSpaceList />}
    </>
  );
};

export const Sidebar: FC<Props> = ({ className }) => {
  const [isExpanded, setExpanded] = useAtom(isSidebarExpandedAtom);
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
                <ExpandedSidebarContent />
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
