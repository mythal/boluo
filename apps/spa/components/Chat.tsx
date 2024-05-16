'use client';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { Suspense } from 'react';
import { BreakpointProvider } from '../breakpoint';
import { useAutoSelectProxy } from '../hooks/useAutoSelectProxy';
import { isSidebarExpandedAtom } from '../state/ui.atoms';
import { isNoPaneAtom, routeAtom } from '../state/view.atoms';
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
import clsx from 'clsx';

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
  return (
    <BannerContext.Provider value={bannerRef}>
      <IsTouchContext.Provider value={isTouch}>
        <BreakpointProvider>
          <ChatErrorBoundary>
            <div className="view-height accent-brand-600 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
              <div ref={bannerRef} className="col-span-full"></div>
              <Sidebar spaceId={route.type === 'SPACE' ? route.spaceId : undefined} />
              <ChatContentBox>
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
              </ChatContentBox>
            </div>
          </ChatErrorBoundary>
        </BreakpointProvider>
      </IsTouchContext.Provider>
    </BannerContext.Provider>
  );
};

export const ChatContentBox: FC<{ children: ReactNode }> = ({ children }) => {
  const [isSidebarExpanded, setSidebarExpanded] = useAtom(isSidebarExpandedAtom);
  const noPane = useAtomValue(isNoPaneAtom);
  const [shouldAutoFold, setShouldAutoFold] = useState(typeof window !== 'undefined' && window.innerWidth < screens.sm);
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setShouldAutoFold(entries[0]!.contentRect.width < screens.sm);
    });
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);
  const autoFoldSidebar = () => {
    if (shouldAutoFold) {
      setSidebarExpanded(false);
    }
  };
  const showMask = isSidebarExpanded && shouldAutoFold && !noPane;
  return (
    <div
      onTouchStart={autoFoldSidebar}
      onClick={autoFoldSidebar}
      className={clsx(
        'md:divide-pane-divide relative col-end-[-1] flex h-full min-h-0 w-full flex-[1_0] flex-nowrap overflow-y-hidden max-md:overflow-y-hidden md:divide-x md:overflow-x-auto',
        showMask &&
          "after:content-[' '] after:absolute after:inset-0 after:z-20 after:block after:bg-black after:bg-opacity-25 after:dark:bg-opacity-50",
      )}
    >
      {children}
    </div>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
