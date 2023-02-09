import { useEffect, useState } from 'react';
import type { Theme } from '../theme';
import { getThemeFromDom, observeTheme } from '../theme';

export const useTheme = (): Theme => {
  const [theme, setTheme] = useState(getThemeFromDom());

  useEffect(() => {
    return observeTheme(setTheme);
  }, []);

  return theme;
};
