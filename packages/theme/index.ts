// TODO: Refactor

import { type ResolvedTheme, type Theme } from '@boluo/types';

export const CONCRETE_THEMES = ['light', 'dark', 'graphite', 'dusha'] as const;

export const THEMES = [...CONCRETE_THEMES, 'system'] as const;

export const DEFAULT_THEME: Theme = 'system';

export const isTheme = (value: string): value is Theme =>
  (THEMES as readonly string[]).includes(value);

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const THEME_PREFIX = 'theme:';
const THEME_PREFIX_ENCODED = encodeURIComponent(THEME_PREFIX);

const setModeClass = (classList: DOMTokenList, mode: 'light' | 'dark') => {
  classList.toggle('mode-light', mode === 'light');
  classList.toggle('mode-dark', mode === 'dark');
};

export const toTheme = (value: string): Theme => {
  if (value.startsWith('theme:')) {
    value = value.slice(THEME_PREFIX.length);
  } else if (value.startsWith(THEME_PREFIX_ENCODED)) {
    value = decodeURIComponent(value.slice(THEME_PREFIX_ENCODED.length));
  }

  if (value === 'light') return 'light';
  if (value === 'dark') return 'dark';
  if (value === 'graphite') return 'graphite';
  if (value === 'dusha') return 'dusha';
  return DEFAULT_THEME;
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
  if (classList.contains('graphite')) {
    return 'graphite';
  }
  if (classList.contains('dusha')) {
    return 'dusha';
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
  classList.remove('graphite');
  classList.remove('dusha');
  if (queryDark.matches) {
    classList.add('dark');
    classList.remove('light');
    setModeClass(classList, 'dark');
  } else {
    classList.remove('dark');
    classList.add('light');
    setModeClass(classList, 'light');
  }
};

export const setSystemTheme = () => {
  const classList = window.document.documentElement.classList;
  // How do I detect dark mode using JavaScript?
  // https://stackoverflow.com/a/57795495
  classList.remove('graphite');
  classList.remove('dusha');
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    classList.add('dark');
    classList.remove('light');
    setModeClass(classList, 'dark');
  } else {
    classList.remove('dark');
    classList.add('light');
    setModeClass(classList, 'light');
  }
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', setThemeByMediaQuery);
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
      html.classList.remove('graphite');
      html.classList.remove('dusha');
      setModeClass(html.classList, 'light');
      colorScheme = 'light';
      break;
    case 'dark':
      html.classList.remove('system');
      html.classList.remove('light');
      html.classList.add('dark');
      html.classList.remove('graphite');
      html.classList.remove('dusha');
      setModeClass(html.classList, 'dark');
      colorScheme = 'dark';
      break;
    case 'graphite':
      html.classList.remove('system');
      html.classList.remove('light');
      html.classList.remove('dark');
      html.classList.add('graphite');
      html.classList.remove('dusha');
      setModeClass(html.classList, 'dark');
      colorScheme = 'dark';
      break;
    case 'dusha':
      html.classList.remove('system');
      html.classList.remove('light');
      html.classList.remove('dark');
      html.classList.remove('graphite');
      html.classList.add('dusha');
      setModeClass(html.classList, 'light');
      colorScheme = 'light';
      break;
    case 'system':
      html.classList.add('system');
      html.classList.remove('graphite');
      html.classList.remove('dusha');
      setThemeByMediaQuery(window.matchMedia(DARK_MEDIA_QUERY));
      colorScheme = 'light dark';
      break;
  }

  const colorSchemeNode: HTMLMetaElement | null = document.querySelector(
    'meta[name="color-scheme"]',
  );
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

// Resolve system theme to concrete theme
export const resolveSystemTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

// Group themes into light/dark buckets for places that only care about contrast.
export const classifyLightOrDark = (theme: ResolvedTheme): 'light' | 'dark' => {
  return theme === 'light' || theme === 'dusha' ? 'light' : 'dark';
};
