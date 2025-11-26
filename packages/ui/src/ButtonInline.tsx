import clsx from 'clsx';
import React from 'react';

interface ExtendedButtonInlineProps {
  variant?: 'primary' | 'default';
  ref?: React.Ref<HTMLButtonElement>;
}

export type ButtonInlineProps = React.ComponentPropsWithoutRef<'button'> &
  ExtendedButtonInlineProps;

export const ButtonInline: React.FC<ButtonInlineProps> = function ButtonInline({
  children,
  className,
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
        'ButtonInline inline-flex items-center justify-center rounded-xs px-[0.5em] py-0.5 transition-shadow duration-100',
        'text-text-primary',
        'bg-action-secondary-bg shadow-action-secondary-border ring-border-focus/75 focus:ring',
        'hover:bg-action-secondary-bg-hover pressed:bg-action-secondary-bg-active',
        'pressed:shadow-border-strong/25 pressed:shadow-[0_0px_0_1px] shadow-[0_-1px_0_0_inset,0_0_0_1px]',
        'cursor-pointer text-[80%]',
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
};
