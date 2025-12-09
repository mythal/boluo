import { useSetAtom, useStore } from 'jotai';
import { useEffect, useState } from 'react';
import { useChannelAtoms } from './useChannelAtoms';

const HIDE_DELAY_MS = 20000;
const HIDE_TOOLBOX_BEFORE_MS = 10000;
const HIDE_PLACEHOLDER_BEFORE_MS = 5000;

/**
 * Manage self preview auto-hide countdown while keeping updates local to the preview.
 */
export const useSelfPreviewAutoHide = () => {
  const { selfPreviewHideAtAtom, selfPreviewShouldHoldAtom } = useChannelAtoms();
  const store = useStore();
  const setHideAt = useSetAtom(selfPreviewHideAtAtom);
  const [hideToolbox, setHideToolbox] = useState(false);
  const [hidePlaceholder, setHidePlaceholder] = useState(false);

  useEffect(() => {
    let timer: number | null = null;
    const update = () => {
      if (timer != null) {
        window.clearTimeout(timer);
      }
      const shouldHold = store.get(selfPreviewShouldHoldAtom);
      if (shouldHold) {
        setHideAt(null);
        setHideToolbox(false);
        setHidePlaceholder(false);
        timer = null;
        return;
      }
      const now = Date.now();
      let hideAt = store.get(selfPreviewHideAtAtom);
      if (hideAt === 0) {
        setHideToolbox(true);
        setHidePlaceholder(true);
        timer = null;
        return;
      }
      if (hideAt == null) {
        hideAt = now + HIDE_DELAY_MS;
        setHideAt(hideAt);
      }
      const msUntilHide = hideAt - now;
      if (msUntilHide <= 0) {
        setHideToolbox(true);
        setHidePlaceholder(true);
        setHideAt(0);
        timer = null;
        return;
      }
      setHideToolbox(msUntilHide <= HIDE_TOOLBOX_BEFORE_MS);
      setHidePlaceholder(msUntilHide <= HIDE_PLACEHOLDER_BEFORE_MS);
      const nextDelay = Math.min(
        ...[
          msUntilHide,
          msUntilHide - HIDE_TOOLBOX_BEFORE_MS,
          msUntilHide - HIDE_PLACEHOLDER_BEFORE_MS,
        ].filter((ms) => ms > 0),
      );
      timer = window.setTimeout(update, nextDelay);
    };
    const unsubscribeHideAt = store.sub(selfPreviewHideAtAtom, update);
    const unsubscribeHold = store.sub(selfPreviewShouldHoldAtom, update);
    update();
    return () => {
      if (timer != null) {
        window.clearTimeout(timer);
      }
      unsubscribeHideAt();
      unsubscribeHold();
    };
  }, [
    setHideAt,
    setHidePlaceholder,
    setHideToolbox,
    store,
    selfPreviewHideAtAtom,
    selfPreviewShouldHoldAtom,
  ]);

  return { hidePlaceholder, hideToolbox };
};
