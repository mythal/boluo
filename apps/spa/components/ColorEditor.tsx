import {
  PALETTE_PREFIX,
  RANDOM_PREFIX,
  computeColors,
  isGameColor,
  palette,
  paletteKeys,
  parseGameColor,
  parseHexColor,
} from '@boluo/color';
import { Button } from '@boluo/ui/Button';
import { ColorCell } from '@boluo/ui/ColorCell';
import { ColorPickerInput } from '@boluo/ui/ColorPickerInput';
import { getNameStrokeStyle } from '@boluo/ui/chat/NameBox';
import { classifyLightOrDark } from '@boluo/theme';
import { type FC, type ReactNode, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

interface Props {
  color: string;
  colorSeed: string;
  fallbackColor?: string;
  fallbackColorSeed?: string;
  textValue: string;
  onTextChange: (color: string) => void;
  onSelectColor: (color: string) => void;
  disabled?: boolean;
  title?: ReactNode;
}

export const ColorEditor: FC<Props> = ({
  color,
  colorSeed,
  fallbackColor,
  fallbackColorSeed,
  textValue,
  onTextChange,
  onSelectColor,
  disabled = false,
  title,
}) => {
  const resolvedTheme = useResolvedTheme();
  const lightOrDark = classifyLightOrDark(resolvedTheme);
  const effectiveColor = color === '' && fallbackColor != null ? fallbackColor : color;
  const effectiveSeed = color === '' && fallbackColorSeed != null ? fallbackColorSeed : colorSeed;
  const parsedColors = useMemo(() => parseGameColor(effectiveColor), [effectiveColor]);
  const computedColors = useMemo(
    () => computeColors(effectiveSeed, parsedColors),
    [effectiveSeed, parsedColors],
  );
  const computedColor = computedColors[lightOrDark];
  const isInvalid = !isGameColor(textValue.trim());
  const colorPickerValue = parseHexColor(textValue.trim())?.toUpperCase() ?? computedColor;

  return (
    <div>
      {title != null && <div className="block pb-1 font-bold">{title}</div>}
      <div className="flex w-full gap-2 py-4">
        <div className="light mode-light">
          <div
            className="stroke-name border-border-strong rounded-lg border bg-white p-6"
            style={{
              color: computedColors.light,
              ...getNameStrokeStyle(computedColors.light, 'light', {
                type: 'solid',
                color: '#FFFFFF',
              }),
            }}
          >
            <FormattedMessage defaultMessage="In Light Mode" />
          </div>
        </div>
        <div className="dark mode-dark">
          <div
            className="stroke-name border-border-strong rounded-lg border bg-slate-900 p-6"
            style={{
              color: computedColors.dark,
              ...getNameStrokeStyle(computedColors.dark, 'dark', {
                type: 'solid',
                color: '#0F172A',
              }),
            }}
          >
            <FormattedMessage defaultMessage="In Dark Mode" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 py-2">
        <ColorPickerInput
          className="py-2"
          colorValue={colorPickerValue}
          textValue={textValue}
          onChange={onTextChange}
          disabled={disabled}
          colorInputClassName={`border ${parsedColors[lightOrDark].type === 'hex' ? 'border-border-strong' : 'border-border-subtle'}`}
          textInputClassName={isInvalid ? 'border-state-danger-border' : undefined}
        />
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onSelectColor(RANDOM_PREFIX + Math.random().toString())}
        >
          <FormattedMessage defaultMessage="Shuffle Random Color" />
        </Button>
      </div>

      <div className="flex gap-1 py-2">
        {paletteKeys.map((colorKey) => {
          const selected = color === `${PALETTE_PREFIX}${colorKey}`;
          return (
            <ColorCell
              key={colorKey}
              color={palette[colorKey][lightOrDark]}
              selected={selected}
              onClick={() => onSelectColor(`${PALETTE_PREFIX}${colorKey}`)}
              isLoading={disabled}
            />
          );
        })}
      </div>
    </div>
  );
};
