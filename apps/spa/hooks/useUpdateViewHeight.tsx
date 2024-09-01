import { useEffect } from 'react';

const updateViewHeight = () => {
  if (typeof window === 'undefined') return;
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--view-height', `${height}px`);
};

const updateViewHeightOnFocus = (e: FocusEvent) => {
  if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
    setTimeout(() => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--view-height', `${height}px`);
    }, 100);
  }
};

export const useUpdateViewHeight = () => {
  useEffect(() => {
    updateViewHeight();
    window.addEventListener('resize', updateViewHeight);
    window.addEventListener('orientationchange', updateViewHeight);
    window.addEventListener('focus', updateViewHeightOnFocus);
    window.addEventListener('blur', updateViewHeightOnFocus);
    return () => {
      window.removeEventListener('resize', updateViewHeight);
      window.removeEventListener('orientationchange', updateViewHeight);
      window.removeEventListener('focus', updateViewHeightOnFocus);
      window.removeEventListener('blur', updateViewHeightOnFocus);
    };
  }, []);
};
