import { useEffect, useState } from 'react';
import { getThemeFromDom, observeTheme, Theme } from './index';

export const useTheme = (): Theme => {
  const [theme, setTheme] = useState(getThemeFromDom());

  useEffect(() => {
    return observeTheme(setTheme);
  }, []);

  return theme;
};
