import type { MutableRefObject } from 'react';
import { useEffect, useRef } from 'react';

export const useDetectUpScroll = (scroller: HTMLDivElement | null, bottomLock: MutableRefObject<boolean>) => {
  const scrollTop = useRef<number>(0);
  useEffect(() => {
    if (!scroller) {
      return;
    }
    const handler = () => {
      const currentTop = scroller.scrollTop;
      if (scrollTop.current > currentTop) {
        bottomLock.current = false;
      }
      scrollTop.current = currentTop;
    };
    scroller.addEventListener('scroll', handler, { passive: true });
    return () => scroller.removeEventListener('scroll', handler);
  }, [bottomLock, scroller]);
};
