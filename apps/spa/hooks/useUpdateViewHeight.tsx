import { getOS } from '@boluo/utils/browser';
import { useEffect } from 'react';

const measureAvailableViewHeight = () => {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const virtualKeyboard = navigator.virtualKeyboard;
  const keyboardHeight = virtualKeyboard?.overlaysContent ? virtualKeyboard.boundingRect.height : 0;
  return Math.max(0, viewportHeight - keyboardHeight);
};

const updateViewHeight = () => {
  const height = measureAvailableViewHeight();
  document.documentElement.style.setProperty('--view-height', `${height}px`);
};

export const useUpdateViewHeight = () => {
  useEffect(() => {
    if (getOS() === 'iOS') {
      return;
    }
    const viewport = window.visualViewport;
    const virtualKeyboard = navigator.virtualKeyboard;
    const previousOverlaysContent = virtualKeyboard?.overlaysContent;
    if (virtualKeyboard) {
      virtualKeyboard.overlaysContent = true;
    }

    let animationFrame: number | undefined;
    let settleTimer: number | undefined;
    const scheduleUpdate = () => {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        animationFrame = undefined;
        updateViewHeight();
      });
    };
    const updateOnInputFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) {
        return;
      }
      updateViewHeight();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        updateViewHeight();
        if (document.activeElement === target) {
          target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }, 300);
    };

    updateViewHeight();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);
    document.addEventListener('focusin', updateOnInputFocus);
    document.addEventListener('focusout', updateOnInputFocus);
    viewport?.addEventListener('resize', scheduleUpdate);
    virtualKeyboard?.addEventListener('geometrychange', scheduleUpdate);
    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
      document.removeEventListener('focusin', updateOnInputFocus);
      document.removeEventListener('focusout', updateOnInputFocus);
      viewport?.removeEventListener('resize', scheduleUpdate);
      virtualKeyboard?.removeEventListener('geometrychange', scheduleUpdate);
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      window.clearTimeout(settleTimer);
      if (virtualKeyboard && previousOverlaysContent !== undefined) {
        virtualKeyboard.overlaysContent = previousOverlaysContent;
      }
    };
  }, []);
};
