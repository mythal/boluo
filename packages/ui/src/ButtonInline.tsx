import clsx from 'clsx';
import React from 'react';

interface ExtendedButtonInlineProps {
  variant?: 'default' | 'primary';
  groupHover?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export type ButtonInlineProps = React.ComponentPropsWithoutRef<'button'> &
  ExtendedButtonInlineProps;

export const ButtonInline: React.FC<ButtonInlineProps> = function ButtonInline({
  children,
  className,
  variant = 'default',
  groupHover,
  ref,
  ...props
}: ButtonInlineProps) {
  if (props.type == null) {
    props.type = 'button';
  }
  return (
    <button
      className={clsx(
        className,
        'ButtonInline inline-flex items-center justify-center rounded-sm px-[0.5em] py-0.5 transition-shadow duration-100',
        // 'ring-border-focus focus:ring',
        'cursor-pointer border text-[80%] disabled:cursor-not-allowed',
        variant === 'default' && [
          'text-text-primary',
          'bg-action-secondary-bg shadow-action-secondary-border pressed:shadow-[0_1px_0_0_inset] shadow-[0_-1px_0_0_inset]',
          'border-action-secondary-border',
          'hover:bg-action-secondary-bg-hover',
          groupHover && 'group-hover:bg-action-secondary-bg-hover',
          'pressed:bg-action-secondary-bg-active',
        ],
        variant === 'primary' && [
          'text-action-primary-text',
          'bg-action-primary-bg border-action-primary-border shadow-action-primary-border pressed:shadow-[0_1px_0_0_inset] shadow-[0_-1px_0_0_inset]',
          'hover:bg-action-primary-bg-hover',
          groupHover && 'group-hover:bg-action-primary-bg-hover',
          'pressed:bg-action-primary-bg-active pressed:border-b-action-primary-bg-active pressed:shadow-[0_1px_0_0_var(--color-action-primary-border)_inset]',
          'disabled:bg-action-primary-bg-disabled disabled:text-text-inverted-secondary disabled:cursor-not-allowed',
        ],
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
};
