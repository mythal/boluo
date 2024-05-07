'use client';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC, useEffect, useMemo, useRef } from 'react';
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
import { getThemeFromCookie, setThemeToDom, writeThemeToCookie } from '@boluo/theme';
import { useQuerySettings } from '../hooks/useQuerySettings';
import { ChatInvite } from './ChatInvite';

const useSetThemeScheme = () => {
  const themeFromCookie = useMemo(getThemeFromCookie, []);
  const settings = useQuerySettings().data;
  const themeFromSettings = settings?.theme;
  useEffect(() => {
    if (themeFromSettings) {
      writeThemeToCookie(themeFromSettings);
      setThemeToDom(themeFromSettings);
    } else if (themeFromCookie) {
      setThemeToDom(themeFromCookie);
    }
  }, [themeFromCookie, themeFromSettings]);
};

if (typeof window !== 'undefined' && process.env.SENTRY_DSN && window.location.hostname.endsWith('.boluo.chat')) {
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        environment: process.env.NODE_ENV,
        dsn: process.env.SENTRY_DSN,
        tunnel: '/tunnel/',
        integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
        // Performance Monitoring
        tracesSampleRate: 1.0, //  Capture 100% of the transactions
        // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
        tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
        // Session Replay
        replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
        replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
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
                  className="md:divide-pane-divide relative col-end-[-1] flex h-full min-h-0 w-full flex-[1_0] flex-nowrap overflow-y-hidden max-md:overflow-y-hidden md:divide-x md:overflow-x-auto"
                >
                  <Suspense fallback={<PaneLoading grow />}>
                    {route.type === 'SPACE' && <ChatSpace key={route.spaceId} spaceId={route.spaceId} />}
                    {route.type === 'NOT_FOUND' && <ChatNotFound />}
                    {route.type === 'ROOT' && <ChatRoot />}
                    {route.type === 'INVITE' && <ChatInvite spaceId={route.spaceId} token={route.token} />}
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
