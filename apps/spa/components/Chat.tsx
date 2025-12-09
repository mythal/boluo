'use client';
import { useAtom, useAtomValue } from 'jotai';
import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';
import { Suspense } from 'react';
import { BreakpointProvider } from '../breakpoint';
import { useBackendUrlSetupEffect } from '../hooks/useBackendUrlSetupEffect';
import { isSidebarExpandedAtom } from '../state/ui.atoms';
import { isNoPaneAtom, routeAtom } from '../state/view.atoms';
import { ChatNotFound } from './ChatNotFound';
import { ChatRoot } from './ChatRoot';
import { ChatSpace } from './ChatSpace';
import { PaneLoading } from './PaneLoading';
import { Sidebar } from './sidebar/Sidebar';
import { BannerContext } from '../hooks/useBannerNode';
import { useDetectIsTouch, IsTouchContext } from '@boluo/ui/hooks/useIsTouch';
import screens from '@boluo/ui/screens.json';
import {
  getThemeFromCookie,
  resolveSystemTheme,
  setThemeToDom,
  writeThemeToCookie,
} from '@boluo/theme';
import { useQuerySettings } from '../hooks/useQuerySettings';
import { ChatInvite } from './ChatInvite';
import { PaneEmpty } from './PaneEmpty';
import { useIsClient } from '@boluo/common/hooks/useIsClient';
import clsx from 'clsx';
import { ResolvedThemeContext } from '../hooks/useResolvedTheme';
import { SettingsContext } from '../hooks/useSettings';
import type { Settings } from '@boluo/settings';
import { useUpdateViewHeight } from '../hooks/useUpdateViewHeight';
import type { ResolvedTheme, Theme } from '@boluo/types';

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

const Chat: FC = () => {
  const { data: settings } = useQuerySettings();
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const route = useAtomValue(routeAtom);
  const isClient = useIsClient();
  useBackendUrlSetupEffect();
  const resolvedTheme = useThemeSetup(settings);
  useUpdateViewHeight();

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
    <SettingsContext value={settings}>
      <ResolvedThemeContext value={resolvedTheme}>
        <BannerContext value={bannerRef}>
          <IsTouchContext value={isTouch}>
            <BreakpointProvider>
              <div className="view-height accent-brand-strong grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
                <div ref={bannerRef} className="col-span-full"></div>
                <Sidebar spaceId={route.type === 'SPACE' ? route.spaceId : undefined} />
                <ChatContentBox>
                  {!isClient ? (
                    <PaneEmpty />
                  ) : (
                    <Suspense fallback={<PaneLoading initSizeLevel={1} />}>
                      {route.type === 'SPACE' && (
                        <ChatSpace key={route.spaceId} spaceId={route.spaceId} />
                      )}
                      {route.type === 'NOT_FOUND' && <ChatNotFound />}
                      {route.type === 'ROOT' && <ChatRoot />}
                      {route.type === 'INVITE' && (
                        <ChatInvite spaceId={route.spaceId} token={route.token} />
                      )}
                    </Suspense>
                  )}
                </ChatContentBox>
              </div>
            </BreakpointProvider>
          </IsTouchContext>
        </BannerContext>
      </ResolvedThemeContext>
    </SettingsContext>
  );
};

export const ChatContentBox: FC<{ children: ReactNode }> = ({ children }) => {
  const [isSidebarExpanded, setSidebarExpanded] = useAtom(isSidebarExpandedAtom);
  const noPane = useAtomValue(isNoPaneAtom);
  const [shouldAutoFold, setShouldAutoFold] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < screens.sm;
  });
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
        'ChatContentBox',
        'md:divide-border-pane relative -col-end-1 flex h-full min-h-0 w-full flex-[1_0] flex-nowrap overflow-y-hidden transition duration-300 max-md:overflow-y-hidden md:divide-x md:overflow-x-auto',
        showMask ? 'cursor-pointer brightness-50' : '',
      )}
    >
      {children}
    </div>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
