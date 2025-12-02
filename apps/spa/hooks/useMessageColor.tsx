import { computeColors, parseGameColor } from '@boluo/color';
import { type User } from '@boluo/api';
import { useMemo } from 'react';
import { useResolvedTheme } from './useResolvedTheme';

export const useMessageColor = (
  user: User | null | undefined,
  inGame: boolean,
  messageColor: string | null | undefined,
): string => {
  const theme = useResolvedTheme();
  return useMemo(() => {
    if (user == null) {
      return theme === 'light' ? '#000' : '#FFF';
    }
    const parsedColor = parseGameColor(messageColor || user.defaultColor);
    return computeColors(user.id, parsedColor)[theme];
  }, [messageColor, theme, user]);
};
