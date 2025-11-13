import type { RefObject } from 'react';
import { useCallback, useEffect, useState } from 'react';

type Breakpoints = Record<string, number>;

interface Config<W extends Breakpoints, H extends Breakpoints> {
  width?: W;
  height?: H;
}

export const useContainerQuery = <W extends Breakpoints, H extends Breakpoints>(
  ref: RefObject<HTMLElement | null>,
  config: Config<W, H>,
): [keyof W | null, keyof H | null] => {
  const { width: widthConfig, height: heightConfig } = config;
  const calculateWidthBreakPoint: (rect: DOMRectReadOnly | null | undefined) => keyof W | null =
    useCallback(
      (rect) => {
        if (!widthConfig || !rect) {
          return null;
        }
        let fittest: number = -1;
        let breakpointName: keyof W | null = null;
        for (const name in widthConfig) {
          const breakpoint = widthConfig[name]!;
          if (rect.width >= breakpoint && breakpoint > fittest) {
            fittest = breakpoint;
            breakpointName = name;
          }
        }
        return breakpointName;
      },
      [widthConfig],
    );

  const calculateHeightBreakPoint: (rect: DOMRectReadOnly | null | undefined) => keyof H | null =
    useCallback(
      (rect) => {
        if (!heightConfig || !rect) {
          return null;
        }

        let fittest: number = -1;
        let breakpointName: keyof H | null = null;
        for (const name in heightConfig) {
          const breakpoint = heightConfig[name]!;
          if (rect.height >= breakpoint && breakpoint > fittest) {
            fittest = breakpoint;
            breakpointName = name;
          }
        }
        return breakpointName;
      },
      [heightConfig],
    );
  const rect = ref.current?.getBoundingClientRect();
  const [widthBreakpoint, setWidthBreakpoint] = useState<keyof W | null>(
    calculateWidthBreakPoint(rect),
  );
  const [heightBreakpoint, setHeightBreakpoint] = useState<keyof H | null>(
    calculateHeightBreakPoint(rect),
  );
  useEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    setWidthBreakpoint(calculateWidthBreakPoint(rect));
    setHeightBreakpoint(calculateHeightBreakPoint(rect));
    const observer = new ResizeObserver((entries) => {
      if (entries.length !== 1) {
        throw new Error('wrong count of entries.');
      }
      const entry = entries[0]!;
      const rect = entry.target.getBoundingClientRect();
      setWidthBreakpoint(calculateWidthBreakPoint(rect));
      setHeightBreakpoint(calculateHeightBreakPoint(rect));
    });
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [ref, calculateWidthBreakPoint, calculateHeightBreakPoint]);
  return [widthBreakpoint, heightBreakpoint];
};
