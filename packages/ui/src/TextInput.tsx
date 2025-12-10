import clsx from 'clsx';
import React, { type FC } from 'react';

interface Variant {
  variant?: 'normal' | 'error' | 'warning';
}

interface EnablePasswordManagerAutoComplete {
  enablePasswordManagerAutoComplete?: boolean;
}

type InputProps = React.ComponentPropsWithoutRef<'input'> &
  Variant & { ref?: React.Ref<HTMLInputElement> } & EnablePasswordManagerAutoComplete;
type TextAreaProps = React.ComponentPropsWithoutRef<'textarea'> &
  Variant & { ref?: React.Ref<HTMLTextAreaElement> };

export const inputStyle = (variant: Variant['variant'] = 'normal') =>
  clsx(
    'rounded-sm border border-solid px-3 py-2',
    'text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ring-border-focus',
    'disabled:cursor-not-allowed disabled:brightness-125 disabled:contrast-50 dark:disabled:brightness-75',
    'shadow-[0_1px_0_0_inset]',
    variant === 'normal' && [
      'border-border-default bg-surface-default   hover:enabled:border-border-strong',
      'shadow-border-default',
    ],
    variant === 'error' && [
      'border-state-danger-border bg-state-danger-bg placeholder:text-state-danger-text focus:border-state-danger-border hover:enabled:border-state-danger-border',
      'shadow-state-danger-border',
    ],
    variant === 'warning' && [
      'border-state-warning-border bg-state-warning-bg placeholder:text-state-warning-text focus:border-state-warning-border hover:enabled:border-state-warning-border',
      'shadow-state-warning-border',
    ],
  );

export const TextInput: FC<InputProps> = ({
  variant,
  className,
  ref,
  enablePasswordManagerAutoComplete = false,
  ...props
}: InputProps) => {
  return (
    <input
      ref={ref}
      {...props}
      className={clsx('TextInput', inputStyle(variant), className)}
      data-1p-ignore={!enablePasswordManagerAutoComplete}
    />
  );
};

export const TextArea = ({ className, variant, ref, ...props }: TextAreaProps) => {
  return (
    <textarea {...props} className={clsx('TextArea', inputStyle(variant), className)} ref={ref} />
  );
};
