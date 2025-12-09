import { useEffect, useState } from 'react';
import { type Theme } from '@boluo/types';
import { getThemeFromDom, observeTheme } from './index';

export const useTheme = (): Theme => {
  const [theme, setTheme] = useState(getThemeFromDom());

  useEffect(() => {
    return observeTheme(setTheme);
  }, []);

  return theme;
};
