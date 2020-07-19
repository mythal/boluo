export const DEFAULT_TITLE = 'Boluo';

export const genTitle = (s: string) => `${s} - Boluo`;

export const setTitle = (s?: string) => {
  if (s) {
    document.title = genTitle(s);
  } else {
    document.title = DEFAULT_TITLE;
  }
};

export const getRoot = () => {
  return document.getElementById('root') as HTMLElement;
};

export const setRealHeight = () => {
  // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
  document.documentElement.style.setProperty('--window-height', `${window.innerHeight}px`);
};

export const ifMobile = (then: () => void) => {
  // https://stackoverflow.com/a/24600597
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    then();
  }
};
