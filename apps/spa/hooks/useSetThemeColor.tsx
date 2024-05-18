import { useEffect } from 'react';
import { useResolvedTheme } from './useResolvedTheme';

export const useSetThemeColor = (sidebarOpen: boolean) => {
  const theme = useResolvedTheme();
  useEffect(() => {
    const themeColor = getComputedStyle(document.documentElement).getPropertyValue(
      sidebarOpen ? `--colors-bg` : `--colors-pane-header-bg`,
    );

    const themeColorMeta = document.querySelector('meta[name=theme-color]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', themeColor);
    } else {
      const newThemeColorMeta = document.createElement('meta');
      newThemeColorMeta.name = 'theme-color';
      newThemeColorMeta.content = themeColor;
      document.head.appendChild(newThemeColorMeta);
    }
  }, [sidebarOpen, theme]);
};
