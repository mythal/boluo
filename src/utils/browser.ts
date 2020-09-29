export const getRoot = () => {
  return document.getElementById('root') as HTMLElement;
};

export const setRealHeight = () => {
  // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
  document.documentElement.style.setProperty('--window-height', `${window.innerHeight}px`);
};

export const isMobile = /Mobi|Android/i.test(navigator.userAgent);

export const isMac = navigator.userAgent.indexOf('Mac OS X') != -1;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const isIe = document.documentMode !== undefined;

const preventDefault = (e: TouchEvent) => {
  e.preventDefault();
};

export function disableScroll() {
  document.body.addEventListener('touchmove', preventDefault, { passive: false });
}

export function enableScroll() {
  document.body.removeEventListener('touchmove', preventDefault);
}

export function delay(callback: () => void, timeout?: number) {
  if (window.requestIdleCallback) {
    const options = timeout ? { timeout } : undefined;
    window.requestIdleCallback(callback, options);
  } else {
    window.setTimeout(callback, timeout);
  }
}

export function recordNext() {
  const pathname = location.pathname;
  if (pathname.startsWith('/login') || pathname.startsWith('/sign-up')) {
    return;
  }
  window.sessionStorage.setItem('next', location.pathname);
}

export function popNext(): string | null {
  const next = window.sessionStorage.getItem('next');
  window.sessionStorage.removeItem('next');
  return next;
}
