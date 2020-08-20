export const getRoot = () => {
  return document.getElementById('root') as HTMLElement;
};

export const setRealHeight = () => {
  // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
  document.documentElement.style.setProperty('--window-height', `${window.innerHeight}px`);
};

export const isMobile = /Mobi|Android/i.test(navigator.userAgent);

export const isMac = navigator.userAgent.indexOf('Mac OS X') != -1;

const preventDefault = (e: TouchEvent) => {
  e.preventDefault();
};

export function disableScroll() {
  document.body.addEventListener('touchmove', preventDefault, { passive: false });
}

export function enableScroll() {
  document.body.removeEventListener('touchmove', preventDefault);
}
