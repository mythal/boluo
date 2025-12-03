import { type FC, useEffect, useMemo, useRef } from 'react';
import { useSelfPreviewAutoHide } from '../../hooks/useSelfPreviewAutoHide';
import { useStore } from 'jotai';

export const SelfPreviewHideProgress: FC = () => {
  const store = useStore();
  const progressAtom = useSelfPreviewAutoHide();
  const progressRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const progressNode = progressRef.current;
    if (!progressNode) return;
    progressNode.style.transition = 'transform 200ms linear';
    progressNode.style.transformOrigin = 'left center';
    const updateProgress = () => {
      const progress = store.get(progressAtom) ?? 0;
      const clamped = Math.max(0, Math.min(1, progress));
      progressNode.style.transform = `scaleX(${clamped})`;
    };
    updateProgress();
    const unsubscribe = store.sub(progressAtom, updateProgress);
    return () => {
      unsubscribe();
      if (progressNode) {
        progressNode.style.transform = 'scaleX(0)';
      }
    };
  }, [store, progressAtom]);
  return (
    <div
      className="bg-brand-strong pointer-events-none absolute top-0 right-0 left-0 h-px"
      style={{ transform: 'scaleX(0)' }}
      ref={progressRef}
    ></div>
  );
};
