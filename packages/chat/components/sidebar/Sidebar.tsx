import clsx from 'clsx';
import { useMe } from '@boluo/common';
import { useAtom, useAtomValue } from 'jotai';
import type { FC } from 'react';
import { useCallback } from 'react';
import { toggle } from '@boluo/utils';
import { useSpace } from '../../hooks/useSpace';
import { isSidebarExpandedAtom, sidebarContentStateAtom } from '../../state/ui.atoms';
import { SidebarChannelList } from './SidebarChannelList';
import { SidebarSpaceList } from './SidebarSpaceList';
import { SpaceOptions } from './SidebarSpaceOptions';
import { SidebarUserOperations } from './SidebarUserOperations';
import { SidebarStateContext } from './useSidebarState';
import { ConnectionIndicatior } from './ConnectionIndicator';

interface Props {
  className?: string;
}

const SidebarContent: FC = () => {
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
  if (!isExpanded) {
    return null;
  }
  return (
    <SidebarStateContext.Provider value={{ isExpanded: isExpanded }}>
      <div className={className}>
        <div className={clsx('w-sidebar relative flex flex-grow flex-col justify-between overflow-hidden')}>
          <div className="overflow-y-auto overflow-x-hidden">
            <SidebarContent />
          </div>

          <div className="">
            <SidebarUserOperations />

            <ConnectionIndicatior />
          </div>
        </div>
      </div>
    </SidebarStateContext.Provider>
  );
};
