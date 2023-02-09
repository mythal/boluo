export type Theme = 'light' | 'dark' | 'system';

export const DEFAULT_THEME: Theme = 'system';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const toTheme = (value: string): Theme => {
  if (value === 'light') {
    return 'light';
  } else if (value === 'dark') {
    return 'dark';
  } else {
    return DEFAULT_THEME;
  }
};

export const getThemeFromDom = (): Theme => {
  const classList = window.document.documentElement.classList;
  console.log(classList);
  if (classList.contains('system')) {
    return 'system';
  }
  if (classList.contains('dark')) {
    return 'dark';
  } else if (classList.contains('light')) {
    return 'light';
  }
  return DEFAULT_THEME;
};

const setThemeByMediaQuery = <T extends { matches: boolean }>(queryDark: T) => {
  const classList = window.document.documentElement.classList;
  if (!classList.contains('system')) {
    return;
  }
  if (queryDark.matches) {
    classList.add('dark');
    classList.remove('light');
  } else {
    classList.remove('dark');
    classList.add('light');
  }
};

const setSystemTheme = () => {
  const classList = window.document.documentElement.classList;
  // How do I detect dark mode using JavaScript?
  // https://stackoverflow.com/a/57795495
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    classList.add('dark');
    classList.remove('light');
  } else {
    classList.remove('dark');
    classList.add('light');
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setThemeByMediaQuery);
};

export const watchSystemTheme = () => {
  if (!window.matchMedia) {
    return;
  }
  clearWatchSystemTheme();
  window.matchMedia(DARK_MEDIA_QUERY).addEventListener('change', setThemeByMediaQuery);
  setThemeByMediaQuery(window.matchMedia(DARK_MEDIA_QUERY));
};

export const clearWatchSystemTheme = () => {
  if (!window.matchMedia) {
    return;
  }
  window.matchMedia(DARK_MEDIA_QUERY).removeEventListener('change', setThemeByMediaQuery);
};

export const setThemeToDom = (value: string): Theme => {
  const html = window.document.documentElement;
  const theme = toTheme(value);
  switch (theme) {
    case 'light':
      html.classList.remove('system');
      html.classList.add('light');
      html.classList.remove('dark');
      break;
    case 'dark':
      html.classList.remove('system');
      html.classList.remove('light');
      html.classList.add('dark');
      break;
    case 'system':
      html.classList.add('system');
      setThemeByMediaQuery(window.matchMedia(DARK_MEDIA_QUERY));
      break;
  }
  return theme;
};

export const observeTheme = (callback: (theme: Theme) => void): () => void => {
  const node = window.document.documentElement;
  const config: MutationObserverInit = {
    attributeFilter: ['class'],
    subtree: false,
    attributeOldValue: false,
    characterDataOldValue: false,
  };

  const observer = new MutationObserver(() => {
    callback(getThemeFromDom());
  });

  observer.observe(node, config);
  return () => observer.disconnect();
};
