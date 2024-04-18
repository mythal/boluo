import clsx from 'clsx';
import { useQueryUser } from '@boluo/common';
import { useAtom, useAtomValue } from 'jotai';
import type { FC, ReactNode } from 'react';
import { isSidebarExpandedAtom, sidebarContentStateAtom } from '../../state/ui.atoms';
import { SidebarChannelList } from './SidebarChannelList';
import { SidebarSpaceList } from './SidebarSpaceList';
import { SpaceOptions } from './SidebarSpaceOptions';
import { SidebarUserOperations } from './SidebarUserOperations';
import { SidebarStateContext } from './useSidebarState';
import { ConnectionIndicatior } from './ConnectionIndicator';
import { useQuerySpace } from '../../hooks/useQuerySpace';
import { User } from '@boluo/api';

interface Props {
  className?: string;
  spaceId?: string;
}

const SidebarContent: FC<{ spaceId: string; currentUser: User | undefined | null }> = ({ spaceId, currentUser }) => {
  const { data: space } = useQuerySpace(spaceId);
  const contentState = useAtomValue(sidebarContentStateAtom);
  if (space == null) {
    return null;
  }
  return (
    <>
      <SpaceOptions space={space} currentUser={currentUser} />
      {contentState === 'CHANNELS' && <SidebarChannelList spaceId={space.id} />}
      {contentState === 'SPACES' && <SidebarSpaceList currentUser={currentUser} />}
    </>
  );
};

export const Sidebar: FC<Props> = ({ className, spaceId }) => {
  const { data: currentUser, isLoading: isQueryingUser } = useQueryUser();
  const [isExpanded, setExpanded] = useAtom(isSidebarExpandedAtom);
  if (!isExpanded) {
    return null;
  }
  let content: ReactNode = null;
  if (spaceId == null) {
    content = currentUser == null ? null : <SidebarSpaceList currentUser={currentUser} />;
  } else {
    content = <SidebarContent spaceId={spaceId} currentUser={currentUser} />;
  }

  return (
    <SidebarStateContext.Provider value={{ isExpanded: isExpanded }}>
      <div className={className}>
        <div className={clsx('w-sidebar relative flex flex-grow flex-col justify-between overflow-hidden')}>
          <div className="overflow-y-auto overflow-x-hidden">{content}</div>

          <div className="">
            {!isQueryingUser && <SidebarUserOperations currentUser={currentUser} />}

            <ConnectionIndicatior />
          </div>
        </div>
      </div>
    </SidebarStateContext.Provider>
  );
};
