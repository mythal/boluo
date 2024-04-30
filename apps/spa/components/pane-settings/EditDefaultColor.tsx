import { FC, useCallback, useMemo } from 'react';
import {
  palette,
  paletteKeys,
  generateColor,
  RANDOM_PREFIX,
  PALETTE_PREFIX,
  parseGameColor,
  computeColors,
} from '../../color';
import { ApiError, User } from '@boluo/api';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { mutate } from 'swr';
import { useTheme } from '@boluo/theme/useTheme';
import { resolveSystemTheme } from '@boluo/theme';
import { Button } from '@boluo/ui/Button';

const ColorCell: FC<{
  color: string;
  selected: boolean;
  onClick: (color: string) => void;
  isLoading: boolean;
}> = ({ color, selected, onClick, isLoading }) => {
  return (
    <button
      className={`h-10 w-10 rounded border-[2px] ${isLoading ? 'grayscale' : ''} ${selected ? 'border-highest' : 'border-lowest'}`}
      style={{ backgroundColor: color }}
      onClick={() => onClick(color)}
    />
  );
};

export const EditDefaultColor: FC<{ currentUser: User }> = ({ currentUser }) => {
  const theme = resolveSystemTheme(useTheme());
  const key = ['/users/query', null] as const;
  const { trigger, error, isMutating } = useSWRMutation<User, ApiError, typeof key, string>(
    key,
    async (_, { arg: color }) => {
      const editResult = await post('/users/edit', null, { defaultColor: color });
      return editResult.unwrap();
    },
    {
      onSuccess: async () => {
        await mutate(['/users/query', null]);
        await mutate(['/users/query', currentUser.id]);
      },
    },
  );

  const handleEditDefaultColor = useCallback(
    (color: string) => () => {
      if (color !== currentUser.defaultColor) {
        void trigger(color);
      }
    },
    [currentUser.defaultColor, trigger],
  );

  const parsedColors = useMemo(() => parseGameColor(currentUser.defaultColor), [currentUser.defaultColor]);
  const computedColors = useMemo(() => computeColors(currentUser.id, parsedColors), [currentUser.id, parsedColors]);
  const parsedColor = parsedColors[theme];
  const randomColorSeedSuffix = parsedColor.type === 'random' ? parsedColor.seed : '';
  return (
    <div>
      <div className="block pb-1 font-bold">
        <FormattedMessage defaultMessage="Default Color" />
      </div>
      <div className="flex w-full gap-2 py-4">
        <div className="bg-light-bg rounded-lg border p-6" style={{ color: computedColors.light }}>
          <FormattedMessage defaultMessage="In Light Mode" />
        </div>
        <div className="bg-dark-bg rounded-lg border p-6" style={{ color: computedColors.dark }}>
          <FormattedMessage defaultMessage="In Dark Mode" />
        </div>
      </div>

      <div className="flex items-center gap-2 py-2">
        <ColorCell
          color={generateColor(currentUser.id + randomColorSeedSuffix)}
          selected={parsedColors[theme].type === 'random'}
          onClick={handleEditDefaultColor(RANDOM_PREFIX + randomColorSeedSuffix)}
          isLoading={isMutating}
        />
        <Button onClick={handleEditDefaultColor(RANDOM_PREFIX + Math.random().toString())}>
          <FormattedMessage defaultMessage="Shuffle Random Color" />
        </Button>
      </div>

      <div className="flex gap-1 py-2">
        {paletteKeys.map((color) => {
          const selected = currentUser.defaultColor === `${PALETTE_PREFIX}${color}`;
          return (
            <ColorCell
              key={color}
              color={palette[color][theme]}
              selected={selected}
              onClick={handleEditDefaultColor(`${PALETTE_PREFIX}${color}`)}
              isLoading={isMutating}
            />
          );
        })}
      </div>
    </div>
  );
};
