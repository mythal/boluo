'use client';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC, useEffect, useRef } from 'react';
import { Suspense } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { BreakpointProvider } from '../breakpoint';
import { useAutoSelectProxy } from '../hooks/useAutoSelectProxy';
import { isSidebarExpandedAtom } from '../state/ui.atoms';
import { routeAtom } from '../state/view.atoms';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import { ChatNotFound } from './ChatNotFound';
import { ChatRoot } from './ChatRoot';
import { ChatSkeleton } from './ChatSkeleton';
import { ChatSpace } from './ChatSpace';
import { PaneLoading } from './PaneLoading';
import { Sidebar } from './sidebar/Sidebar';
import { useSetThemeColor } from '../hooks/useSetThemeColor';
import { BannerContext } from '../hooks/useBannerNode';
import { IsTouchContext, useDetectIsTouch } from '../hooks/useIsTouch';
import screens from '@boluo/ui/screens.json';
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
    if (window.innerWidth < screens.sm) {
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
              <div className="view-height accent-brand-600 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
                <div ref={bannerRef} className="col-span-full"></div>
                <Sidebar spaceId={route.type === 'SPACE' ? route.spaceId : undefined} />
                <div
                  onTouchStart={autoFoldSidebar}
                  onClick={autoFoldSidebar}
                  className="md:divide-pane-divide relative col-end-[-1] flex h-full min-h-0 w-full flex-[1_0] flex-nowrap overflow-y-hidden max-md:flex-col max-md:overflow-y-hidden md:divide-x md:overflow-x-auto"
                >
                  <Suspense fallback={<PaneLoading />}>
                    {route.type === 'SPACE' && <ChatSpace key={route.spaceId} spaceId={route.spaceId} />}
                    {route.type === 'NOT_FOUND' && <ChatNotFound />}
                    {route.type === 'ROOT' && <ChatRoot />}
                  </Suspense>
                </div>
              </div>
            </Suspense>
          </ChatErrorBoundary>
        </BreakpointProvider>
      </IsTouchContext.Provider>
    </BannerContext.Provider>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
