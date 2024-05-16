'use client';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC, useEffect, useRef } from 'react';
import { Suspense } from 'react';
import { BreakpointProvider } from '../breakpoint';
import { useAutoSelectProxy } from '../hooks/useAutoSelectProxy';
import { isSidebarExpandedAtom } from '../state/ui.atoms';
import { routeAtom } from '../state/view.atoms';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import { ChatNotFound } from './ChatNotFound';
import { ChatRoot } from './ChatRoot';
import { ChatSpace } from './ChatSpace';
import { PaneLoading } from './PaneLoading';
import { Sidebar } from './sidebar/Sidebar';
import { useSetThemeColor } from '../hooks/useSetThemeColor';
import { BannerContext } from '../hooks/useBannerNode';
import { IsTouchContext, useDetectIsTouch } from '../hooks/useIsTouch';
import screens from '@boluo/ui/screens.json';
import { getThemeFromCookie, setThemeToDom, writeThemeToCookie } from '@boluo/theme';
import { useQuerySettings } from '../hooks/useQuerySettings';
import { ChatInvite } from './ChatInvite';
import { PaneEmpty } from './PaneEmpty';
import { useIsClient } from '../hooks/useIsClient';
import { IS_DEVELOPMENT, SENTRY_DSN, SENTRY_TUNNEL } from '../const';

const useSetThemeScheme = () => {
  const settings = useQuerySettings().data;
  const themeFromSettings = settings?.theme;
  useEffect(() => {
    const themeFromCookie = getThemeFromCookie();
    if (themeFromSettings) {
      writeThemeToCookie(themeFromSettings);
      setThemeToDom(themeFromSettings);
    } else if (themeFromCookie) {
      setThemeToDom(themeFromCookie);
    }
  }, [themeFromSettings]);
};

if (typeof window !== 'undefined' && SENTRY_DSN) {
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        environment: IS_DEVELOPMENT ? 'development' : 'production',
        dsn: SENTRY_DSN,
        tunnel: SENTRY_TUNNEL,
        integrations: [],
      });
      console.log('Sentry ready');
    })
    .catch((err) => {
      console.warn('Failed to load Sentry', err);
    });
}

const Chat: FC = () => {
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const route = useAtomValue(routeAtom);
  const isClient = useIsClient();
  useAutoSelectProxy(60 * 1000);
  const setSidebarExpanded = useSetAtom(isSidebarExpandedAtom);
  useSetThemeScheme();
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
            <div className="view-height accent-brand-600 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
              <div ref={bannerRef} className="col-span-full"></div>
              <Sidebar spaceId={route.type === 'SPACE' ? route.spaceId : undefined} />
              <div
                onTouchStart={autoFoldSidebar}
                onClick={autoFoldSidebar}
                className="md:divide-pane-divide relative col-end-[-1] flex h-full min-h-0 w-full flex-[1_0] flex-nowrap overflow-y-hidden max-md:overflow-y-hidden md:divide-x md:overflow-x-auto"
              >
                {!isClient ? (
                  <PaneEmpty />
                ) : (
                  <Suspense fallback={<PaneLoading grow />}>
                    {route.type === 'SPACE' && <ChatSpace key={route.spaceId} spaceId={route.spaceId} />}
                    {route.type === 'NOT_FOUND' && <ChatNotFound />}
                    {route.type === 'ROOT' && <ChatRoot />}
                    {route.type === 'INVITE' && <ChatInvite spaceId={route.spaceId} token={route.token} />}
                  </Suspense>
                )}
              </div>
            </div>
          </ChatErrorBoundary>
        </BreakpointProvider>
      </IsTouchContext.Provider>
    </BannerContext.Provider>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
