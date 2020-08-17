import React, { useLayoutEffect } from 'react';

import { useRect } from './useRect';

const defaultEstimateSize = () => 50;

type ScrollAlignment = 'start' | 'center' | 'end' | 'auto';

interface ScrollToOptions {
  align: ScrollAlignment;
}

interface ScrollToOffsetOptions extends ScrollToOptions {}

interface ScrollToIndexOptions extends ScrollToOptions {}

export interface VirtualOptions<T> {
  size: number;
  parentRef: React.RefObject<T>;
  estimateSize?: (index: number, crossSize?: number) => number;
  overscan?: number;
  horizontal?: boolean;
  scrollToFn?: (offset: number, defaultScrollToFn?: (offset: number) => void) => void;
  paddingStart?: number;
  paddingEnd?: number;
}

interface Measurement {
  index: number;
  start: number;
  size: number;
  end: number;
}

export interface VirtualItem extends Measurement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  measure: (rect: DOMRect) => void;
}

interface Latest {
  overscan: number;
  measurements: Measurement[];
  outerSize: number;
  totalSize: number;
  scrollOffset: number;
}

export interface VirtualResult {
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollToOffset: (index: number, options?: ScrollToOffsetOptions) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  start: number;
  end: number;
}
export function useVirtual<T extends Element>({
  size = 0,
  estimateSize = defaultEstimateSize,
  overscan = 0,
  paddingStart = 0,
  paddingEnd = 0,
  parentRef,
  horizontal,
  scrollToFn,
}: VirtualOptions<T>): VirtualResult {
  const sizeKey = horizontal ? 'width' : 'height';
  const crossKey = !horizontal ? 'width' : 'height';
  const scrollKey = horizontal ? 'scrollLeft' : 'scrollTop';
  const latestRef = React.useRef<Partial<Latest>>({});

  const { [sizeKey]: outerSize, [crossKey]: crossSize } = useRect(parentRef) || {
    [sizeKey]: 0,
    [crossKey]: 0,
  };

  const defaultScrollToFn: (offset: number) => void = React.useCallback(
    (offset) => {
      if (parentRef.current) {
        parentRef.current[scrollKey] = offset;
      }
    },
    [parentRef, scrollKey]
  );

  const scrollTo = React.useCallback(
    (offset) => {
      if (scrollToFn) {
        scrollToFn(offset, defaultScrollToFn);
      } else {
        defaultScrollToFn(offset);
      }
    },
    [defaultScrollToFn, scrollToFn]
  );

  const [measuredCache, setMeasuredCache] = React.useState<Record<number, number | undefined>>({});

  const measurements: Measurement[] = React.useMemo(() => {
    const measurements: Measurement[] = [];
    for (let i = 0; i < size; i++) {
      const measuredSize = measuredCache[i];
      const start = measurements[i - 1] ? measurements[i - 1].end : paddingStart;
      const size = measuredSize !== undefined ? measuredSize : estimateSize(i, crossSize);
      const end = start + size;
      measurements[i] = { index: i, start, size, end };
    }
    return measurements;
  }, [estimateSize, measuredCache, paddingStart, size, crossSize]);

  const totalSize = (measurements[size - 1]?.end || 0) + paddingEnd;

  Object.assign(latestRef.current, {
    overscan,
    measurements,
    outerSize,
    totalSize,
  });

  const [range, setRange] = React.useState<Range>({ start: 0, end: 0 });

  useLayoutEffect(() => {
    const element = parentRef.current;

    if (element === null) {
      return;
    }
    const onScroll = () => {
      latestRef.current.scrollOffset = element[scrollKey];
      setRange((prevRange) => {
        return calculateRange(latestRef.current as Latest, prevRange);
      });
    };

    // Determine initially visible range
    onScroll();

    element.addEventListener('scroll', onScroll, {
      capture: false,
      passive: true,
    });

    return () => {
      element.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentRef, parentRef.current, scrollKey, size /* required */]);

  const virtualItems: VirtualItem[] = React.useMemo(() => {
    const virtualItems = [];

    for (let i = range.start; i <= range.end; i++) {
      const measurement = measurements[i];

      const item: VirtualItem = {
        ...measurement,
        measure: (rect: DOMRect) => {
          const { scrollOffset } = latestRef.current as Latest;
          const { [sizeKey]: measuredSize } = rect;

          if (measuredSize !== item.size) {
            if (item.start < scrollOffset) {
              defaultScrollToFn(scrollOffset + (measuredSize - item.size));
            }

            setMeasuredCache((old) => ({
              ...old,
              [i]: measuredSize,
            }));
          }
        },
      };

      virtualItems.push(item);
    }

    return virtualItems;
  }, [range.start, range.end, measurements, sizeKey, defaultScrollToFn]);

  const mountedRef = React.useRef<boolean | undefined>();

  useLayoutEffect(() => {
    if (mountedRef.current) {
      if (estimateSize || size) {
        setMeasuredCache({});
      }
    }
    mountedRef.current = true;
  }, [estimateSize, size]);

  const scrollToOffset = React.useCallback(
    (toOffset: number, { align }: ScrollToOffsetOptions = { align: 'start' }) => {
      const { scrollOffset, outerSize } = latestRef.current as Latest;

      if (align === 'auto') {
        if (toOffset <= scrollOffset) {
          align = 'start';
        } else if (scrollOffset >= scrollOffset + outerSize) {
          align = 'end';
        } else {
          align = 'start';
        }
      }

      if (scrollTo === undefined) {
      } else if (align === 'start') {
        scrollTo(toOffset);
      } else if (align === 'end') {
        scrollTo(toOffset - outerSize);
      } else if (align === 'center') {
        scrollTo(toOffset - outerSize / 2);
      }
    },
    [scrollTo]
  );

  const tryScrollToIndex = React.useCallback(
    (index: number, { align = 'auto', ...rest } = {}) => {
      const { measurements, scrollOffset, outerSize } = latestRef.current as Latest;

      const measurement = measurements[Math.max(0, Math.min(index, size - 1))];

      if (!measurement) {
        return;
      }

      if (align === 'auto') {
        if (measurement.end >= scrollOffset + outerSize) {
          align = 'end';
        } else if (measurement.start <= scrollOffset) {
          align = 'start';
        } else {
          return;
        }
      }

      const toOffset =
        align === 'center'
          ? measurement.start + measurement.size / 2
          : align === 'end'
          ? measurement.end
          : measurement.start;

      scrollToOffset(toOffset, { align, ...rest });
    },
    [scrollToOffset, size]
  );

  const scrollToIndex = React.useCallback(
    (index: number, options?: ScrollToIndexOptions) => {
      // We do a double request here because of
      // dynamic sizes which can cause offset shift
      // and end up in the wrong spot. Unfortunately,
      // we can't know about those dynamic sizes until
      // we try and render them. So double down!
      tryScrollToIndex(index, options);
      requestAnimationFrame(() => {
        tryScrollToIndex(index, options);
      });
    },
    [tryScrollToIndex]
  );

  return {
    virtualItems,
    totalSize,
    scrollToOffset,
    scrollToIndex,
    start: range.start,
    end: range.end,
  };
}

export interface Range {
  start: number;
  end: number;
}

function calculateRange({ overscan, measurements, outerSize, scrollOffset }: Latest, prevRange: Range): Range {
  const total = measurements.length;
  let start = total - 1;
  while (start > 0 && measurements[start].end >= scrollOffset) {
    start -= 1;
  }
  let end = 0;
  while (end < total - 1 && measurements[end].start <= scrollOffset + outerSize) {
    end += 1;
  }

  // Always add at least one overscan item, so focus will work
  start = Math.max(start - overscan, 0);
  end = Math.min(end + overscan, total - 1);

  if (!prevRange || prevRange.start !== start || prevRange.end !== end) {
    return { start, end };
  }

  return prevRange;
}
