import type { MutableRefObject, RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { IndexLocationWithAlign, VirtuosoHandle } from 'react-virtuoso';

export const useVirtualListBottomLock = (
  virtualListRef: RefObject<VirtuosoHandle>,
  itemLength: number,
): MutableRefObject<boolean> => {
  const bottomLock = useRef(true);
  useEffect(() => {
    if (bottomLock.current) {
      const handle = window.setTimeout(() => {
        const config: IndexLocationWithAlign = {
          index: itemLength - 1,
          align: 'end',
          behavior: 'smooth',
        };
        if (bottomLock.current) {
          virtualListRef.current?.scrollToIndex(config);
        }
      }, 100);
      return () => window.clearTimeout(handle);
    }
  }, [itemLength, virtualListRef]);
  return bottomLock;
};
