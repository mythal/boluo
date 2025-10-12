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
    'rounded-sm border border-solid px-3 py-2',
    'text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1',
    'disabled:cursor-not-allowed disabled:brightness-125 disabled:contrast-50 dark:disabled:brightness-75',
    variant === 'normal' &&
      'border-border-default bg-surface-default focus:border-border-focus hover:enabled:border-border-strong focus:ring-[color:var(--color-border-focus)]',
    variant === 'error' &&
      'border-state-danger-border bg-state-danger-bg placeholder:text-state-danger-text focus:border-state-danger-border hover:enabled:border-state-danger-border focus:ring-[color:var(--color-state-danger-border)]',
    variant === 'warning' &&
      'border-state-warning-border bg-state-warning-bg placeholder:text-state-warning-text focus:border-state-warning-border hover:enabled:border-state-warning-border focus:ring-[color:var(--color-state-warning-border)]',
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
