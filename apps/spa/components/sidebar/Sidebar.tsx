import clsx from 'clsx';
import { useQueryCurrentUser } from '@boluo/common';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState, type FC, type ReactNode } from 'react';
import { isSidebarExpandedAtom, sidebarContentStateAtom } from '../../state/ui.atoms';
import { SidebarChannels } from './SidebarChannels';
import { SidebarSpaceList } from './SidebarSpaceList';
import { SpaceOptions } from './SidebarSpaceOptions';
import { SidebarUserOperations } from './SidebarUserOperations';
import { ConnectionIndicatior } from './ConnectionIndicator';
import { useQuerySpace } from '../../hooks/useQuerySpace';
import { User } from '@boluo/api';
import { AppOperations } from './AppOperations';
import { useIsClient } from '../../hooks/useIsClient';
import { isApple } from '@boluo/utils';
import { SidebarButton } from './SidebarButton';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';

interface Props {
  spaceId?: string;
}

const SidebarContent: FC<{ spaceId: string; currentUser: User | undefined | null }> = ({ spaceId, currentUser }) => {
  const { data: space, isLoading } = useQuerySpace(spaceId);
  const contentState = useAtomValue(sidebarContentStateAtom);
  if (space == null) {
    if (isLoading) {
      return <div>{/* placeholder */}</div>;
    } else {
      return <SidebarSpaceList currentUser={currentUser} currentSpaceId={spaceId} />;
    }
  }
  return (
    <>
      <SpaceOptions space={space} currentUser={currentUser} />
      {contentState === 'CHANNELS' && <SidebarChannels spaceId={space.id} />}
      {contentState === 'SPACES' && <SidebarSpaceList currentUser={currentUser} currentSpaceId={spaceId} />}
    </>
  );
};
function isRunningStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}
export const Sidebar: FC<Props> = ({ spaceId }) => {
  const { data: currentUser, isLoading: isQueryingUser } = useQueryCurrentUser();
  const isClient = useIsClient();
  const [isExpanded, setExpanded] = useAtom(isSidebarExpandedAtom);
  useSetThemeColor(isExpanded);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === '/') {
        if (isApple() && e.metaKey) {
          setExpanded((x) => !x);
        } else if (e.ctrlKey) {
          setExpanded((x) => !x);
        }
      }
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [setExpanded]);
  const foldedNode = <SidebarButton />;
  if (!isExpanded) {
    return foldedNode;
  }
  let content: ReactNode;
  if (!isClient) {
    content = <div>{/* Placeholder */}</div>;
  } else if (spaceId == null) {
    content = <SidebarSpaceList currentUser={currentUser} currentSpaceId={null} />;
  } else {
    content = <SidebarContent spaceId={spaceId} currentUser={currentUser} />;
  }

  return (
    <div className={clsx('bg-bg standalone-bottom-padding relative flex h-full min-h-0 flex-none flex-col')}>
      <div className={clsx('w-sidebar relative flex flex-grow flex-col justify-between overflow-hidden')}>
        {content}

        <div className="">
          <AppOperations currentUser={currentUser} />
          {!isQueryingUser && <SidebarUserOperations currentUser={currentUser} />}

          {isClient && <ConnectionIndicatior spaceId={spaceId} />}
        </div>
        <SidebarButton />
      </div>
    </div>
  );
};
