import clsx from 'clsx';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useMemo, type FC, type ReactNode } from 'react';
import { isSidebarExpandedAtom, sidebarContentStateAtom } from '../../state/ui.atoms';
import { SidebarChannels } from './SidebarChannels';
import { SidebarSpaceList } from './SidebarSpaceList';
import { SpaceOptions } from './SidebarSpaceOptions';
import { SidebarButton } from '@boluo/ui/chat/SidebarButton';
import { SidebarUserOperations } from './SidebarUserOperations';
import { ConnectionIndicatior } from './ConnectionIndicator';
import { useQuerySpace } from '@boluo/hooks/useQuerySpace';
import { type User } from '@boluo/api';
import { AppOperations } from './AppOperations';
import { useIsClient } from '@boluo/hooks/useIsClient';
import { isApple } from '@boluo/utils/browser';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import { SidebarGuestContent } from './SidebarGuestContent';
import { SidebarContentLoading } from './SidebarContentLoading';
import { SidebarConnectionSelector } from './SidebarConnectionSelector';
import { connectionStateAtom } from '../../state/chat.atoms';
import { SidebarButtonController } from './SidebarButtonController';

interface Props {
  spaceId?: string;
}

const SidebarContent: FC<{ spaceId: string; currentUser: User | undefined | null }> = ({
  spaceId,
  currentUser,
}) => {
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
      <SpaceOptions space={space} />
      {contentState === 'CHANNELS' && <SidebarChannels spaceId={space.id} />}
      {contentState === 'SPACES' && (
        <SidebarSpaceList currentUser={currentUser} currentSpaceId={spaceId} />
      )}
    </>
  );
};
export const Sidebar: FC<Props> = ({ spaceId }) => {
  const { data: currentUser, isLoading: isQueryingUser } = useQueryCurrentUser();
  const isClient = useIsClient();
  const contentState = useAtomValue(sidebarContentStateAtom);
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
  const sidebarButton = useMemo(() => {
    return <SidebarButtonController />;
  }, []);
  if (!isExpanded) {
    return sidebarButton;
  }
  let content: ReactNode = <SidebarContentLoading />;
  if (!isClient) {
    content = <SidebarContentLoading />;
  } else if (contentState === 'CONNECTIONS') {
    content = <SidebarConnectionSelector />;
  } else if (spaceId == null) {
    if (isQueryingUser) {
      content = <SidebarContentLoading />;
    } else if (currentUser == null) {
      content = <SidebarGuestContent />;
    } else {
      content = <SidebarSpaceList currentUser={currentUser} currentSpaceId={null} />;
    }
  } else {
    content = <SidebarContent spaceId={spaceId} currentUser={currentUser} />;
  }

  return (
    <div
      className={clsx(
        'Sidebar bg-sidebar-bg standalone-bottom-padding border-sidebar-border relative flex h-full min-h-0 flex-none flex-col border-r',
      )}
    >
      <div
        className={clsx('w-sidebar relative flex grow flex-col justify-between overflow-hidden')}
      >
        {content}

        <div className="">
          <AppOperations currentUser={currentUser} />
          {!isQueryingUser && <SidebarUserOperations currentUser={currentUser} />}

          {isClient && <ConnectionIndicatior spaceId={spaceId} />}
        </div>
        {sidebarButton}
      </div>
    </div>
  );
};
