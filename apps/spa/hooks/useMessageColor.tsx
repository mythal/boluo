import { User } from '@boluo/api';
import { useMemo } from 'react';
import { computeColors, parseGameColor } from '../color';
import { ResolvedTheme } from '@boluo/theme';

export const useMessageColor = (
  theme: ResolvedTheme,
  user: User | null | undefined,
  inGame: boolean,
  messageColor: string | null | undefined,
): string => {
  return useMemo(() => {
    if (!inGame || user == null) {
      return theme === 'light' ? '#000' : '#FFF';
    }
    const parsedColor = parseGameColor(messageColor || user.defaultColor);
    return computeColors(user.id, parsedColor)[theme];
  }, [inGame, messageColor, theme, user]);
};
