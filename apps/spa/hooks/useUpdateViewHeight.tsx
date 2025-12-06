import { getOS } from '@boluo/utils/browser';
import { useEffect } from 'react';

const MIN_KEYBOARD_INSET = 120;

const updateViewHeight = () => {
  if (typeof window === 'undefined') return;
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--view-height', `${height}px`);
  const overlaysContent = navigator.virtualKeyboard?.overlaysContent === true;
  if (!overlaysContent) {
    document.documentElement.style.setProperty('--keyboard-inset', `0px`);
    return;
  }
  const rawKeyboardInset =
    navigator.virtualKeyboard?.boundingRect.height ||
    Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
  const keyboardInset = rawKeyboardInset > MIN_KEYBOARD_INSET ? rawKeyboardInset : 0;
  document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
};

const updateViewHeightOnFocus = (e: FocusEvent) => {
  if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
    setTimeout(() => {
      updateViewHeight();
    }, 100);
  }
};

export const useUpdateViewHeight = () => {
  useEffect(() => {
    if (getOS() === 'iOS') {
      return;
    }
    updateViewHeight();
    const viewport = window.visualViewport;
    window.addEventListener('resize', updateViewHeight);
    window.addEventListener('orientationchange', updateViewHeight);
    window.addEventListener('focus', updateViewHeightOnFocus);
    window.addEventListener('blur', updateViewHeightOnFocus);
    viewport?.addEventListener('resize', updateViewHeight);
    return () => {
      window.removeEventListener('resize', updateViewHeight);
      window.removeEventListener('orientationchange', updateViewHeight);
      window.removeEventListener('focus', updateViewHeightOnFocus);
      window.removeEventListener('blur', updateViewHeightOnFocus);
      viewport?.removeEventListener('resize', updateViewHeight);
    };
  }, []);
};
