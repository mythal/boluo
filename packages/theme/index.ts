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

export const writeThemeToCookie = (data: unknown) => {
  if (typeof data !== 'string') {
    return;
  }
  const theme = toTheme(data);
  if (!theme) {
    return;
  }
  document.cookie = `boluo-theme=${theme}; path=/;max-age=31536000`;
};

export const getThemeFromCookie = (): Theme | null => {
  const themeMatch = /boluo-theme=([^;]+)/.exec(document.cookie);
  if (themeMatch == null || themeMatch[1] == null) {
    return null;
  }
  return toTheme(themeMatch[1]);
};

export const getThemeFromDom = (): Theme => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }
  const classList = window.document.documentElement.classList;
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
  let colorScheme: string;
  switch (theme) {
    case 'light':
      html.classList.remove('system');
      html.classList.add('light');
      html.classList.remove('dark');
      colorScheme = 'light';
      break;
    case 'dark':
      html.classList.remove('system');
      html.classList.remove('light');
      html.classList.add('dark');
      colorScheme = 'dark';
      break;
    case 'system':
      html.classList.add('system');
      setThemeByMediaQuery(window.matchMedia(DARK_MEDIA_QUERY));
      colorScheme = 'light dark';
      break;
  }

  const colorSchemeNode: HTMLMetaElement | null = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeNode) {
    colorSchemeNode.content = colorScheme;
  } else {
    const newColorScheme = document.createElement('meta');
    newColorScheme.name = 'color-scheme';
    newColorScheme.content = 'light dark';

    const head = document.querySelector('head');
    if (head) {
      head.appendChild(newColorScheme);
    }
  }
  return theme;
};

export const observeTheme = (callback: (theme: Theme) => void): (() => void) => {
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

export type ResolvedTheme = Exclude<Theme, 'system'>;

export const resolveSystemTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};
