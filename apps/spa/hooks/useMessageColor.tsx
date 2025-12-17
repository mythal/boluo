import { computeColors, parseGameColor } from '@boluo/color';
import { useMemo } from 'react';
import { useResolvedTheme } from './useResolvedTheme';
import { useQueryUser } from '@boluo/hooks/useQueryUser';
import { classifyLightOrDark } from '@boluo/theme';

export const useMessageColor = (
  userId: string,
  inGame: boolean,
  messageColor: string | null | undefined,
): string => {
  const darkOrLight = classifyLightOrDark(useResolvedTheme());
  const { data: user } = useQueryUser(userId);
  return useMemo(() => {
    if (user == null) {
      return darkOrLight === 'light' ? '#000' : '#FFF';
    }
    const parsedColor = parseGameColor(messageColor || user?.defaultColor);
    return computeColors(userId, parsedColor)[darkOrLight];
  }, [messageColor, darkOrLight, user, userId]);
};
