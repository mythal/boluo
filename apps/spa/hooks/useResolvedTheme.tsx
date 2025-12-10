import { type ResolvedTheme } from '@boluo/types';
import React from 'react';
import { recordWarn } from '../error';

export const ResolvedThemeContext = React.createContext<ResolvedTheme | null>(null);

export const useResolvedTheme = (): ResolvedTheme => {
  const theme = React.useContext(ResolvedThemeContext);
  if (theme == null) {
    recordWarn('useResolvedTheme must be used within a ResolvedThemeContext');
    return 'light';
  }
  return theme;
};
