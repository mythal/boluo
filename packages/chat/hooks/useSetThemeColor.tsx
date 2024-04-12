import { useTheme } from '@boluo/theme/useTheme';
import { useEffect } from 'react';

export const useSetThemeColor = () => {
  const theme = useTheme();
  useEffect(() => {
    const themeColor = getComputedStyle(document.documentElement).getPropertyValue(`--colors-theme-${theme}`);

    const themeColorMeta = document.querySelector('meta[name=theme-color]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', themeColor);
    } else {
      const newThemeColorMeta = document.createElement('meta');
      newThemeColorMeta.name = 'theme-color';
      newThemeColorMeta.content = themeColor;
      document.head.appendChild(newThemeColorMeta);
    }
  }, [theme]);
};
