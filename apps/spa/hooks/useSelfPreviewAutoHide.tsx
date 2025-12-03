import { atom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { useEffect, useMemo } from 'react';
import { useChannelAtoms } from './useChannelAtoms';

const HIDE_DELAY_MS = 20000;

/**
 * Manage self preview auto-hide countdown while keeping updates local to the preview.
 */
export const useSelfPreviewAutoHide = () => {
  const {
    composeAtom,
    composeFocusedAtom,
    hasMediaAtom,
    isComposeEmptyAtom,
    selfPreviewNamePanelOpenAtom,
    selfPreviewHideAtAtom,
    selfPreviewProgressAtom,
    isEditingAtom,
  } = useChannelAtoms();
  const store = useStore();
  const setHideAt = useSetAtom(selfPreviewHideAtAtom);
  const setProgress = useSetAtom(selfPreviewProgressAtom);

  const shouldHoldAtom = useMemo(
    () =>
      atom((get) => {
        const hasContent = !get(isComposeEmptyAtom);
        return (
          hasContent ||
          get(composeFocusedAtom) ||
          get(selfPreviewNamePanelOpenAtom) ||
          get(isEditingAtom)
        );
      }),
    [composeFocusedAtom, isComposeEmptyAtom, isEditingAtom, selfPreviewNamePanelOpenAtom],
  );

  useEffect(() => {
    const syncState = () => {
      const shouldHold = store.get(shouldHoldAtom);
      if (shouldHold) {
        setHideAt(null);
        setProgress(null);
        return;
      }
      const now = Date.now();
      const hideAt = store.get(selfPreviewHideAtAtom);
      if (hideAt == null || hideAt <= now) {
        const nextHideAt = now + HIDE_DELAY_MS;
        setHideAt(nextHideAt);
        setProgress(0);
      }
    };
    const unsubscribe = store.sub(shouldHoldAtom, syncState);
    syncState();
    return () => unsubscribe();
  }, [setHideAt, setProgress, shouldHoldAtom, store, selfPreviewHideAtAtom]);

  useEffect(() => {
    let frame: number | null = null;
    const tick = () => {
      const shouldHold = store.get(shouldHoldAtom);
      const hideAt = store.get(selfPreviewHideAtAtom);
      if (shouldHold || hideAt == null) {
        setProgress(null);
        frame = null;
        return;
      }
      const now = Date.now();
      if (now >= hideAt) {
        setProgress(1);
        setHideAt(0);
        frame = null;
        return;
      }
      const progress = Math.min(1, 1 - (hideAt - now) / HIDE_DELAY_MS);
      setProgress(progress);
      frame = window.requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame != null) return;
      frame = window.requestAnimationFrame(tick);
    };
    const unsubscribeHideAt = store.sub(selfPreviewHideAtAtom, start);
    const unsubscribeHold = store.sub(shouldHoldAtom, start);
    start();
    return () => {
      if (frame != null) {
        window.cancelAnimationFrame(frame);
      }
      unsubscribeHideAt();
      unsubscribeHold();
    };
  }, [setHideAt, setProgress, shouldHoldAtom, store, selfPreviewHideAtAtom]);

  return selfPreviewProgressAtom;
};
