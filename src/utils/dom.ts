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
