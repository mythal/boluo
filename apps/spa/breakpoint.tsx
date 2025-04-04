import React, { type FC, type ReactNode, useContext } from 'react';
import { useEffect, useState } from 'react';
import screens from '@boluo/ui/screens.json';

type Screens = typeof screens;

export type Breakpoint = keyof Screens | 'xs';

export const compareBreakpoint = (a: Breakpoint, b: Breakpoint): number => {
  const screensEntries = Object.entries(screens);
  screensEntries.sort(([, a], [, b]) => b - a);

  const aIndex = screensEntries.findIndex(([key]) => key === a);
  const bIndex = screensEntries.findIndex(([key]) => key === b);

  return aIndex - bIndex;
};

const windowBreakpoint = (): Breakpoint => {
  if (typeof window === 'undefined') {
    return 'xs';
  }
  const { innerWidth } = window;

  const screensEntries = Object.entries(screens);
  screensEntries.sort(([, a], [, b]) => b - a);

  for (const [key, value] of screensEntries) {
    if (innerWidth >= value) {
      return key as Breakpoint;
    }
  }
  return 'xs';
};

const useListenBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(windowBreakpoint());

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(windowBreakpoint);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};

const BreakpointContext = React.createContext<Breakpoint | null>(null);

export const BreakpointProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const breakpoint = useListenBreakpoint();

  return <BreakpointContext value={breakpoint}>{children}</BreakpointContext>;
};

export const useBreakpoint = (): Breakpoint => {
  const breakpoint = useContext(BreakpointContext);
  if (breakpoint === null) {
    return windowBreakpoint();
  } else {
    return breakpoint;
  }
};
