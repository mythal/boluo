import clsx from 'clsx';
import { type ChangeEvent, type ComponentPropsWithoutRef, type FC, useCallback } from 'react';
import { TextInput } from './TextInput';

type ColorInputProps = ComponentPropsWithoutRef<'input'>;

export interface ColorPickerInputProps {
  id?: string;
  colorValue: string;
  textValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  colorInputClassName?: ColorInputProps['className'];
  textInputClassName?: string;
}

export const ColorPickerInput: FC<ColorPickerInputProps> = ({
  id,
  colorValue,
  textValue,
  onChange,
  disabled,
  placeholder = '#RRGGBB',
  className,
  colorInputClassName,
  textInputClassName,
}) => {
  const handlePickerChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <input
        id={id}
        type="color"
        value={colorValue}
        onChange={handlePickerChange}
        disabled={disabled}
        className={clsx(
          'h-10 w-10 cursor-pointer rounded border bg-transparent p-1',
          colorInputClassName,
        )}
      />
      <TextInput
        type="text"
        value={textValue}
        onChange={handleTextChange}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx('h-10 w-28 font-mono text-sm', textInputClassName)}
      />
    </div>
  );
};
