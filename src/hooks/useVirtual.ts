import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { Map } from 'immutable';
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
  renderThreshold?: number;
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

export interface VirtualItem extends Measurement {}

interface Latest {
  overscan: number;
  measurements: Measurement[];
  outerSize: number;
  totalSize: number;
  scrollOffset: number;
}

export interface VirtualResult extends Range {
  virtualItems: VirtualItem[];
  totalSize: number;
  measure: (rect: DOMRect, index: number) => void;
  scrollToOffset: (index: number, options?: ScrollToOffsetOptions) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  cacheShift: (offset: number) => void;
}
export function useVirtual<T extends Element>({
  size = 0,
  estimateSize = defaultEstimateSize,
  overscan = 0,
  paddingStart = 0,
  paddingEnd = 0,
  renderThreshold = 0,
  parentRef,
  horizontal,
  scrollToFn,
}: VirtualOptions<T>): VirtualResult {
  const sizeKey = horizontal ? 'width' : 'height';
  const crossKey = !horizontal ? 'width' : 'height';
  const scrollKey = horizontal ? 'scrollLeft' : 'scrollTop';

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

  const [measuredCache, setMeasuredCache] = React.useState<Map<number, number>>(Map());

  useLayoutEffect(() => {
    setMeasuredCache(Map());
  }, [estimateSize]);
  const measurements: Measurement[] = React.useMemo(() => {
    const measurements: Measurement[] = [];
    let prevStart = paddingEnd;
    for (let i = size - 1; i >= 0; i--) {
      const measuredSize = measuredCache.get(i);
      const end = prevStart;
      const size = measuredSize !== undefined ? measuredSize : estimateSize(i);
      const start = end + size;
      prevStart = start;
      measurements[i] = { index: i, start, size, end };
    }
    return measurements;
  }, [estimateSize, measuredCache, paddingEnd, size]);

  const totalSize = (measurements[0]?.start || 0) + paddingStart;
  const latestRef = React.useRef<Latest>({
    overscan,
    measurements,
    outerSize,
    totalSize,
    scrollOffset: 0,
  });

  Object.assign(latestRef.current, {
    overscan,
    measurements,
    outerSize,
    totalSize,
  });

  const [range, setRange] = React.useState<Range>({ start: 0, end: 0, viewportStart: 0, viewportEnd: 0 });

  const shiftOffset = useRef(0);
  useLayoutEffect(() => {
    const element = parentRef.current;

    if (element === null) {
      return;
    }
    const onScroll = () => {
      latestRef.current.scrollOffset = element[scrollKey];

      setRange((prevRange) => {
        if (shiftOffset.current !== 0) {
          const offset = shiftOffset.current;
          shiftOffset.current = 0;
          const { totalSize, outerSize } = latestRef.current;
          if (totalSize < outerSize) {
            return calculateRange(latestRef.current, prevRange);
          }
          return {
            start: prevRange.start + offset,
            end: prevRange.end + offset,
            viewportStart: prevRange.viewportStart + offset,
            viewportEnd: prevRange.viewportEnd + offset,
          };
        }
        return calculateRange(latestRef.current, prevRange);
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
  }, [parentRef, parentRef.current, size, renderThreshold, scrollKey /* required */]);

  const measure = useCallback(
    (rect: DOMRect, index: number) => {
      const { [sizeKey]: measuredSize } = rect;
      const measurement = measurements[index];
      if (measurement === undefined || measuredSize !== measurement.size) {
        setMeasuredCache((old) => old.set(index, measuredSize));
      }
    },
    [measurements, sizeKey]
  );

  const virtualItems: VirtualItem[] = React.useMemo(() => {
    return measurements.slice(range.start, range.end + 1);
  }, [range.start, range.end, measurements]);

  const cacheShift = useCallback(
    (offset?: number) => {
      if (offset === undefined) {
        setMeasuredCache(Map());
        return;
      }
      let shifted: Map<number, number> = Map();
      for (const [key, value] of measuredCache.entries()) {
        shifted = shifted.set(key + offset, value);
      }
      shiftOffset.current = offset;
      setMeasuredCache(shifted);
    },
    [measuredCache]
  );

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
      const { measurements, scrollOffset, totalSize, outerSize } = latestRef.current as Latest;

      const measurement = measurements[Math.max(0, Math.min(index, size - 1))];

      if (!measurement) {
        return;
      }

      if (align === 'auto') {
        if (measurement.end <= totalSize - scrollOffset - outerSize) {
          align = 'end';
        } else if (measurement.start >= totalSize - scrollOffset) {
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

      scrollToOffset(totalSize - toOffset, { align, ...rest });
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
  const prevTotalSize = useRef(0);
  const integral = useRef(0);

  useLayoutEffect(() => {
    if (parentRef.current) {
      const parent = parentRef.current;
      const delta = totalSize - prevTotalSize.current;
      // why negative delta?
      integral.current += delta;
      if (delta > 0) {
        const top = parent.scrollTop + integral.current;
        integral.current = 0;
        parent.scrollTo({ top });
      }
    }
    prevTotalSize.current = totalSize;
  }, [parentRef, totalSize]);
  return {
    virtualItems,
    totalSize,
    scrollToOffset,
    scrollToIndex,
    measure,
    cacheShift,
    ...range,
  };
}

export interface Range {
  start: number;
  end: number;
  viewportStart: number;
  viewportEnd: number;
}

function calculateRange(
  { overscan, measurements, outerSize, totalSize, scrollOffset }: Latest,
  prevRange: Range
): Range {
  const len = measurements.length;

  if (totalSize < outerSize) {
    return { start: 0, end: len - 1, viewportStart: 0, viewportEnd: len - 1 };
  }
  let start = len - 1;
  while (start > 0 && totalSize - measurements[start].end >= scrollOffset) {
    start -= 1;
  }
  let end = 0;
  while (end < len - 1 && totalSize - measurements[end].start <= scrollOffset + outerSize) {
    end += 1;
  }
  const viewportStart = start;
  const viewportEnd = end;

  // Always add at least one overscan item, so focus will work
  start = Math.max(start - overscan, 0);
  end = Math.min(end + overscan, len - 1);

  if (
    !prevRange ||
    prevRange.start !== start ||
    prevRange.end !== end ||
    prevRange.start !== viewportStart ||
    prevRange.viewportEnd !== viewportEnd
  ) {
    return { start, end, viewportStart, viewportEnd };
  }

  return prevRange;
}
