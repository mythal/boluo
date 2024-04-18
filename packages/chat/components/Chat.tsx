'use client';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC, ReactNode, useEffect, useRef } from 'react';
import { Suspense } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { BreakpointProvider } from '../breakpoint';
import { useAutoSelectProxy } from '../hooks/useAutoSelectProxy';
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
import { Sidebar } from './sidebar/Sidebar';
import { ToggleSidebarLine } from './sidebar/ToggleSidebarLine';
import { useSetThemeColor } from '../hooks/useSetThemeColor';
import { BannerContext } from '../hooks/useBannerNode';
import { IsTouchContext, useDetectIsTouch } from '../hooks/useIsTouch';

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
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const route = useAtomValue(routeAtom);
  useAutoSelectProxy(60 * 1000);
  const setSidebarExpanded = useSetAtom(isSidebarExpandedAtom);
  useSetThemeColor();

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehaviorY = 'none';
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehaviorY = '';
    };
  }, []);
  const isTouch = useDetectIsTouch();
  const autoFoldSidebar = () => {
    if (window.innerWidth < 560) {
      setSidebarExpanded(false);
    }
  };

  return (
    <BannerContext.Provider value={bannerRef}>
      <IsTouchContext.Provider value={isTouch}>
        <BreakpointProvider>
          <ChatErrorBoundary>
            <Suspense
              fallback={
                <ChatSkeleton>
                  <Loading />
                </ChatSkeleton>
              }
            >
              <SpaceProvider spaceId={route.type === 'SPACE' ? route.spaceId : null}>
                <div className="view-height accent-brand-600 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
                  <div ref={bannerRef} className="col-span-full"></div>
                  <Sidebar className="bg-bg flex h-full min-h-0 flex-none flex-col" />
                  <div
                    onTouchStart={autoFoldSidebar}
                    onClick={autoFoldSidebar}
                    className="relative col-end-[-1] flex h-full min-h-0 w-full flex-[1_0] flex-nowrap overflow-y-hidden max-md:flex-col max-md:overflow-y-hidden md:divide-x md:overflow-x-auto"
                  >
                    <ToggleSidebarLine />
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
        </BreakpointProvider>
      </IsTouchContext.Provider>
    </BannerContext.Provider>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
