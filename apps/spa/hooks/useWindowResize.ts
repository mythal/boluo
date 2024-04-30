import { useCallback, useEffect, useRef } from 'react';

export function useWindowResize(callback: () => void, timeout = 200) {
  const timer = useRef<number | undefined>(undefined);
  const onResize = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(callback, timeout);
  }, [callback, timeout]);
  useEffect(() => {
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer.current);
    };
  }, [onResize]);
}
