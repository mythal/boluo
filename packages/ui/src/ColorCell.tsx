import clsx from 'clsx';
import { type FC } from 'react';

export interface ColorCellProps {
  color: string;
  selected: boolean;
  onClick: (color: string) => void;
  isLoading?: boolean;
}

export const ColorCell: FC<ColorCellProps> = ({
  color,
  selected,
  onClick,
  isLoading = false,
}) => {
  return (
    <button
      type="button"
      className={clsx(
        'h-10 w-10 rounded border-2',
        isLoading && 'grayscale',
        selected ? 'border-border-strong' : 'border-border-subtle',
      )}
      style={{ backgroundColor: color }}
      onClick={() => onClick(color)}
    />
  );
};
