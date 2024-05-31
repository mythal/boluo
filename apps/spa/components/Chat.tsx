'use client';
import { useAtom, useAtomValue } from 'jotai';
import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';
import { Suspense } from 'react';
import { BreakpointProvider } from '../breakpoint';
import { useAutoSelectProxy } from '../hooks/useAutoSelectProxy';
import { isSidebarExpandedAtom } from '../state/ui.atoms';
import { isNoPaneAtom, routeAtom } from '../state/view.atoms';
import { ChatNotFound } from './ChatNotFound';
import { ChatRoot } from './ChatRoot';
import { ChatSpace } from './ChatSpace';
import { PaneLoading } from './PaneLoading';
import { Sidebar } from './sidebar/Sidebar';
import { BannerContext } from '../hooks/useBannerNode';
import { IsTouchContext, useDetectIsTouch } from '../hooks/useIsTouch';
import screens from '@boluo/ui/screens.json';
import {
  type ResolvedTheme,
  type Theme,
  getThemeFromCookie,
  resolveSystemTheme,
  setThemeToDom,
  writeThemeToCookie,
} from '@boluo/theme';
import { useQuerySettings } from '../hooks/useQuerySettings';
import { ChatInvite } from './ChatInvite';
import { PaneEmpty } from './PaneEmpty';
import { useIsClient } from '../hooks/useIsClient';
import { IS_DEVELOPMENT, SENTRY_DSN, SENTRY_TUNNEL } from '../const';
import clsx from 'clsx';
import { ResolvedThemeContext } from '../hooks/useResolvedTheme';
import { SettingsContext } from '../hooks/useSettings';
import { type Settings } from '@boluo/common';
import * as Sentry from '@sentry/react';

const useThemeSetup = (settings: Settings | undefined | null): ResolvedTheme => {
  const themeFromSettings = settings?.theme;
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  useEffect(() => {
    const themeFromCookie = getThemeFromCookie();
    if (themeFromSettings) {
      if (themeFromCookie !== themeFromSettings) {
        writeThemeToCookie(themeFromSettings);
      }
      setTheme(themeFromSettings);
    } else if (themeFromCookie) {
      setTheme(themeFromCookie);
    }
  }, [themeFromSettings]);
  useEffect(() => {
    setThemeToDom(theme);
    setResolvedTheme(resolveSystemTheme(theme));
  }, [theme]);
  return resolvedTheme;
};

if (typeof window !== 'undefined' && SENTRY_DSN) {
  Sentry.init({
    environment: IS_DEVELOPMENT ? 'development' : 'production',
    dsn: SENTRY_DSN,
    tunnel: SENTRY_TUNNEL,
    integrations: [],
  });
  console.debug('Sentry ready');
}

const Chat: FC = () => {
  const { data: settings } = useQuerySettings();
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const route = useAtomValue(routeAtom);
  const isClient = useIsClient();
  useAutoSelectProxy(60 * 1000);
  const resolvedTheme = useThemeSetup(settings);

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
    <SettingsContext.Provider value={settings}>
      <ResolvedThemeContext.Provider value={resolvedTheme}>
        <BannerContext.Provider value={bannerRef}>
          <IsTouchContext.Provider value={isTouch}>
            <BreakpointProvider>
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
            </BreakpointProvider>
          </IsTouchContext.Provider>
        </BannerContext.Provider>
      </ResolvedThemeContext.Provider>
    </SettingsContext.Provider>
  );
};

export const ChatContentBox: FC<{ children: ReactNode }> = ({ children }) => {
  const [isSidebarExpanded, setSidebarExpanded] = useAtom(isSidebarExpandedAtom);
  const noPane = useAtomValue(isNoPaneAtom);
  const [shouldAutoFold, setShouldAutoFold] = useState(typeof window !== 'undefined' && window.innerWidth < screens.sm);
  useEffect(() => {
    let timeout: number | undefined;
    const observer = new ResizeObserver((entries) => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        setShouldAutoFold(entries[0]!.contentRect.width < screens.sm);
      }, 100);
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
        'md:divide-pane-divide relative col-end-[-1] flex h-full min-h-0 w-full flex-[1_0] flex-nowrap overflow-y-hidden transition duration-300 max-md:overflow-y-hidden md:divide-x md:overflow-x-auto',
        showMask ? 'cursor-pointer brightness-50' : '',
      )}
    >
      {children}
    </div>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
