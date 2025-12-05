import { computeColors, parseGameColor } from '@boluo/color';
import { useMemo } from 'react';
import { useResolvedTheme } from './useResolvedTheme';
import { useQueryUser } from '@boluo/common/hooks/useQueryUser';

export const useMessageColor = (
  userId: string,
  inGame: boolean,
  messageColor: string | null | undefined,
): string => {
  const theme = useResolvedTheme();
  const { data: user } = useQueryUser(userId);
  return useMemo(() => {
    if (user == null) {
      return theme === 'light' ? '#000' : '#FFF';
    }
    const parsedColor = parseGameColor(messageColor || user?.defaultColor);
    return computeColors(userId, parsedColor)[theme];
  }, [messageColor, theme, user, userId]);
};
