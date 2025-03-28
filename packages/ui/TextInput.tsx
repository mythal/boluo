import clsx from 'clsx';
import React, { FC } from 'react';

interface Variant {
  variant?: 'normal' | 'error' | 'warning';
}

type InputProps = React.ComponentPropsWithoutRef<'input'> &
  Variant & { ref?: React.Ref<HTMLInputElement> };
type TextAreaProps = React.ComponentPropsWithoutRef<'textarea'> &
  Variant & { ref?: React.Ref<HTMLTextAreaElement> };

export const inputStyle = (variant: Variant['variant'] = 'normal') =>
  clsx(
    'rounded-sm border-[1px] border-solid px-3 py-2 focus:outline-none disabled:cursor-not-allowed disabled:brightness-125 disabled:contrast-50 dark:disabled:brightness-75',
    variant === 'normal' &&
      'border-input-normal-border-default bg-lowest placeholder:text-input-normal-placeholder focus:border-input-normal-border-focus hover:enabled:border-input-normal-border-hover focus:ring-input-normal-ring',
    variant === 'error' &&
      'border-input-error-border-default bg-input-error-bg ring-input-error-ring placeholder:text-input-error-placeholder focus:border-input-error-border-focus hover:enabled:border-input-error-border-hover',
    variant === 'warning' &&
      'border-input-warning-border-default bg-input-warning-bg ring-input-warning-ring placeholder:text-input-warning-placeholder focus:border-input-warning-border-focus hover:enabled:border-input-warning-border-hover',
  );

export const TextInput: FC<InputProps> = ({ variant, className, ref, ...props }: InputProps) => {
  return (
    <input ref={ref} {...props} className={clsx('TextInput', inputStyle(variant), className)} />
  );
};

export const TextArea = ({ className, variant, ref, ...props }: TextAreaProps) => {
  return (
    <textarea {...props} className={clsx('TextArea', inputStyle(variant), className)} ref={ref} />
  );
};
