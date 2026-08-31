import React from 'react';
import { cls } from '../../utils/classnames';

interface DataAttributes {
  'data-variant'?: 'error' | 'normal';
}

const inputBaseClassName =
  'w-full rounded-[3px] border border-solid border-legacy-gray-700 bg-legacy-input-background p-2 text-legacy-text [transition:all_100ms] hover:border-legacy-gray-400 focus:border-legacy-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:shadow-none disabled:[filter:grayscale(80%)_brightness(80%)_contrast(30%)] data-[variant=error]:bg-legacy-error';

type InputSize = 'normal' | 'large';

const inputSizeClassNames: Record<InputSize, string> = {
  normal: 'text-[1.125rem]',
  large: 'text-[1.25rem]',
};

export const inputClassName = cls(inputBaseClassName, inputSizeClassNames.normal);

type InputProps = React.ComponentPropsWithRef<'input'> &
  DataAttributes & {
    inputSize?: InputSize;
  };

function Input({ className, inputSize = 'normal', ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      className={cls(inputBaseClassName, inputSizeClassNames[inputSize], className)}
      {...props}
    />
  );
}

export default Input;
