import { ResolvedTheme } from '@boluo/theme';
import React from 'react';

export const ResolvedThemeContext = React.createContext<ResolvedTheme | null>(null);

export const useResolvedTheme = (): ResolvedTheme => {
  const theme = React.useContext(ResolvedThemeContext);
  if (theme == null) {
    console.warn('useResolvedTheme must be used within a ResolvedThemeContext');
    return 'light';
  }
  return theme;
};
