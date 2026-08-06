import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RANDOM_PREFIX, computeColors, parseGameColor, parseHexColor } from '@boluo/color';
import { type ApiError, type User } from '@boluo/api';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { mutate } from 'swr';
import { ColorEditor } from '../ColorEditor';
import { classifyLightOrDark } from '@boluo/theme';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export const EditDefaultColor: FC<{ currentUser: User }> = ({ currentUser }) => {
  const lightOrDark = classifyLightOrDark(useResolvedTheme());
  const computedColor = useMemo(
    () => computeColors(currentUser.id, parseGameColor(currentUser.defaultColor))[lightOrDark],
    [currentUser.defaultColor, currentUser.id, lightOrDark],
  );
  const [customColor, setCustomColor] = useState<string>(computedColor);
  const debounceTimer = useRef<number | null>(null);
  const key = ['/users/query', null] as const;
  const { trigger, isMutating } = useSWRMutation<User, ApiError, typeof key, string>(
    key,
    async (_, { arg: color }) => {
      const editResult = await post('/users/edit', null, { defaultColor: color });
      return editResult.unwrap();
    },
    {
      onSuccess: () => {
        void mutate(['/users/query', null]);
        void mutate(['/users/query', currentUser.id]);
      },
    },
  );

  const normalizeColor = useCallback((color: string) => {
    const hex = parseHexColor(color);
    if (hex != null) {
      return hex.toUpperCase();
    }
    return color;
  }, []);

  const handleEditDefaultColor = useCallback(
    (color: string) => {
      const normalizedColor = normalizeColor(color);
      setCustomColor(
        parseHexColor(normalizedColor)?.toUpperCase() ??
          computeColors(currentUser.id, parseGameColor(normalizedColor))[lightOrDark],
      );
      if (normalizedColor !== currentUser.defaultColor) {
        void trigger(normalizedColor);
      }
    },
    [currentUser.defaultColor, currentUser.id, lightOrDark, normalizeColor, trigger],
  );

  const scheduleCustomColorUpdate = useCallback(
    (color: string) => {
      const hex = parseHexColor(color);
      setCustomColor(color);
      if (hex == null) return;
      const normalized = hex.toUpperCase();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = window.setTimeout(() => {
        handleEditDefaultColor(normalized);
      }, 300);
    },
    [handleEditDefaultColor],
  );

  const [prevComputedColor, setPrevComputedColor] = useState(computedColor);
  if (prevComputedColor !== computedColor) {
    setPrevComputedColor(computedColor);
    setCustomColor(computedColor);
  }

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <ColorEditor
      title={<FormattedMessage defaultMessage="Default Color" />}
      color={currentUser.defaultColor}
      colorSeed={currentUser.id}
      textValue={customColor}
      onTextChange={scheduleCustomColorUpdate}
      onSelectColor={handleEditDefaultColor}
      disabled={isMutating}
    />
  );
};
