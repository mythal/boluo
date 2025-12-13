import {
  type CSSProperties,
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PALETTE_PREFIX,
  RANDOM_PREFIX,
  computeColors,
  palette,
  paletteKeys,
  parseHexColor,
  parseGameColor,
} from '@boluo/color';
import { type ApiError, type User } from '@boluo/api';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { mutate } from 'swr';
import { classifyLightOrDark } from '@boluo/theme';
import { Button } from '@boluo/ui/Button';
import { ColorCell } from '@boluo/ui/ColorCell';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ColorPickerInput } from '@boluo/ui/ColorPickerInput';

export const EditDefaultColor: FC<{ currentUser: User }> = ({ currentUser }) => {
  const lightOrDark = classifyLightOrDark(useResolvedTheme());
  const [customColor, setCustomColor] = useState<string>('');
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
      if (normalizedColor !== currentUser.defaultColor) {
        void trigger(normalizedColor);
      }
    },
    [currentUser.defaultColor, normalizeColor, trigger],
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

  const parsedColors = useMemo(
    () => parseGameColor(currentUser.defaultColor),
    [currentUser.defaultColor],
  );
  const computedColors = useMemo(
    () => computeColors(currentUser.id, parsedColors),
    [currentUser.id, parsedColors],
  );
  const colorPickerValue = parseHexColor(customColor)?.toUpperCase() ?? computedColors[lightOrDark];

  useEffect(() => {
    setCustomColor(computedColors[lightOrDark]);
  }, [computedColors, lightOrDark]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div>
      <div className="block pb-1 font-bold">
        <FormattedMessage defaultMessage="Default Color" />
      </div>
      <div className="flex w-full gap-2 py-4">
        <div className="light mode-light">
          <div
            className="stroke-name border-border-strong rounded-lg border bg-white p-6"
            style={
              {
                color: computedColors.light,
                '--name-color': computedColors.light,
              } as CSSProperties
            }
          >
            <FormattedMessage defaultMessage="In Light Mode" />
          </div>
        </div>
        <div className="dark mode-dark">
          <div
            className="stroke-name border-border-strong rounded-lg border bg-slate-900 p-6"
            style={
              {
                color: computedColors.dark,
                '--name-color': computedColors.dark,
              } as CSSProperties
            }
          >
            <FormattedMessage defaultMessage="In Dark Mode" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 py-2">
        <ColorPickerInput
          className="py-2"
          colorValue={colorPickerValue}
          textValue={customColor}
          onChange={scheduleCustomColorUpdate}
          disabled={isMutating}
          colorInputClassName={`border ${parsedColors[lightOrDark].type === 'hex' ? 'border-border-strong' : 'border-border-subtle'}`}
        />
        <Button onClick={() => handleEditDefaultColor(RANDOM_PREFIX + Math.random().toString())}>
          <FormattedMessage defaultMessage="Shuffle Random Color" />
        </Button>
      </div>

      <div className="flex gap-1 py-2">
        {paletteKeys.map((color) => {
          const selected = currentUser.defaultColor === `${PALETTE_PREFIX}${color}`;
          return (
            <ColorCell
              key={color}
              color={palette[color][lightOrDark]}
              selected={selected}
              onClick={() => handleEditDefaultColor(`${PALETTE_PREFIX}${color}`)}
              isLoading={isMutating}
            />
          );
        })}
      </div>
    </div>
  );
};
