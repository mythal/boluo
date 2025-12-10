import { type FC, useCallback, useMemo } from 'react';
import {
  PALETTE_PREFIX,
  RANDOM_PREFIX,
  computeColors,
  generateColor,
  palette,
  paletteKeys,
  parseGameColor,
} from '@boluo/color';
import { type ApiError, type User } from '@boluo/api';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { mutate } from 'swr';
import { classifyLightOrDark } from '@boluo/theme';
import { Button } from '@boluo/ui/Button';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

const ColorCell: FC<{
  color: string;
  selected: boolean;
  onClick: (color: string) => void;
  isLoading: boolean;
}> = ({ color, selected, onClick, isLoading }) => {
  return (
    <button
      className={`h-10 w-10 rounded border-2 ${isLoading ? 'grayscale' : ''} ${selected ? 'border-border-strong' : 'border-border-subtle'}`}
      style={{ backgroundColor: color }}
      onClick={() => onClick(color)}
    />
  );
};

export const EditDefaultColor: FC<{ currentUser: User }> = ({ currentUser }) => {
  const lightOrDark = classifyLightOrDark(useResolvedTheme());
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

  const handleEditDefaultColor = useCallback(
    (color: string) => {
      if (color !== currentUser.defaultColor) {
        void trigger(color);
      }
    },
    [currentUser.defaultColor, trigger],
  );

  const parsedColors = useMemo(
    () => parseGameColor(currentUser.defaultColor),
    [currentUser.defaultColor],
  );
  const computedColors = useMemo(
    () => computeColors(currentUser.id, parsedColors),
    [currentUser.id, parsedColors],
  );
  const parsedColor = parsedColors[lightOrDark];
  const randomColorSeedSuffix = parsedColor.type === 'random' ? parsedColor.seed : '';
  return (
    <div>
      <div className="block pb-1 font-bold">
        <FormattedMessage defaultMessage="Default Color" />
      </div>
      <div className="flex w-full gap-2 py-4">
        <div className="light">
          <div className="rounded-lg border bg-white p-6" style={{ color: computedColors.light }}>
            <FormattedMessage defaultMessage="In Light Mode" />
          </div>
        </div>
        <div className="dark">
          <div
            className="rounded-lg border bg-slate-900 p-6"
            style={{ color: computedColors.dark }}
          >
            <FormattedMessage defaultMessage="In Dark Mode" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 py-2">
        <ColorCell
          color={generateColor(currentUser.id + randomColorSeedSuffix)}
          selected={parsedColors[lightOrDark].type === 'random'}
          onClick={() => handleEditDefaultColor(RANDOM_PREFIX + randomColorSeedSuffix)}
          isLoading={isMutating}
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
