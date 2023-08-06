import { useAtomValue, useSetAtom } from 'jotai';
import { FC, ReactNode, useEffect } from 'react';
import { Suspense } from 'react';
import { Loading } from 'ui/Loading';
import { useAutoSelectProxy } from '../hooks/useAutoSelectProxy';
import { useConnectionEffect } from '../hooks/useConnectionEffect';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { SpaceContext } from '../hooks/useSpace';
import { isSidebarExpandedAtom } from '../state/ui.atoms';
import { routeAtom } from '../state/view.atoms';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import { ChatNotFound } from './ChatNotFound';
import { ChatRoot } from './ChatRoot';
import { ChatSkeleton } from './ChatSkeleton';
import { ChatSpace } from './ChatSpace';
import { PaneLoading } from './PaneLoading';
import { OpenSidebarButton } from './sidebar/OpenSidebarButton';
import { Sidebar } from './sidebar/Sidebar';

const SpaceProvider: FC<{ spaceId: string | null; children: ReactNode }> = ({ spaceId, children }) => {
  const { data: space, isLoading } = useQuerySpace(spaceId);
  if (space != null && isLoading) {
    return (
      <ChatSkeleton>
        <Loading label="Loading Space..." />
      </ChatSkeleton>
    );
  }
  return <SpaceContext.Provider value={space}>{children}</SpaceContext.Provider>;
};

const Chat: FC = () => {
  const route = useAtomValue(routeAtom);
  useAutoSelectProxy(60 * 1000);
  useConnectionEffect();
  const setSidebarExpanded = useSetAtom(isSidebarExpandedAtom);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehaviorY = 'none';
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehaviorY = '';
    };
  }, []);
  const handleTouch = () => {
    if (window.innerWidth < 560) {
      // Auto fold sidebar
      setSidebarExpanded(false);
    }
  };

  return (
    <ChatErrorBoundary>
      <Suspense
        fallback={
          <ChatSkeleton>
            <Loading />
          </ChatSkeleton>
        }
      >
        <SpaceProvider spaceId={route.type === 'SPACE' ? route.spaceId : null}>
          <OpenSidebarButton />
          <div className="flex view-height">
            <Sidebar className="flex flex-col h-full flex-none border-r bg-lowest border-surface-300" />
            <div
              onTouchStart={handleTouch}
              className="flex-[1_0] h-full flex max-md:flex-col flex-nowrap overflow-y-hidden max-md:overflow-y-hidden md:overflow-x-auto md:divide-x"
            >
              <Suspense fallback={<PaneLoading />}>
                {route.type === 'SPACE' && <ChatSpace key={route.spaceId} spaceId={route.spaceId} />}
                {route.type === 'NOT_FOUND' && <ChatNotFound />}
                {route.type === 'ROOT' && <ChatRoot />}
              </Suspense>
            </div>
          </div>
        </SpaceProvider>
      </Suspense>
    </ChatErrorBoundary>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
