import { useCallback, useEffect, useRef, useState } from 'react';

export const useLongPressProgress = (
  startAt: number | null,
  duration: number,
  active: boolean,
): { progress: number; resetProgress: () => void } => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  const clearAnimationFrame = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const resetProgress = useCallback(() => {
    clearAnimationFrame();
    setProgress(0);
  }, [clearAnimationFrame]);

  if ((!active || startAt == null) && progress > 0) {
    resetProgress();
  }
  useEffect(() => {
    if (!active || startAt == null) {
      clearAnimationFrame();
      return;
    }
    const tick = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsed = now - startAt;
      const nextProgress = Math.min(1, elapsed / duration);
      setProgress(nextProgress);
      if (nextProgress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      resetProgress();
    };
  }, [active, clearAnimationFrame, duration, resetProgress, startAt]);

  return { progress, resetProgress };
};
