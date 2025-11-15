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
  return (
    <button
      className={clsx(
        className,
        'ButtonInline pressed:translate-y-0 inline-block -translate-y-px rounded-sm px-[0.5em] py-0.5 transition-shadow duration-100',
        'text-text-primary',
        'bg-action-secondary-bg shadow-border-default ring-border-focus/75 focus:ring',
        'hover:bg-action-secondary-bg-hover hover:shadow-border-strong pressed:bg-action-secondary-bg-active',
        'pressed:shadow-border-strong/25 pressed:shadow-[0_0px_0_1px] shadow-[0_1px_0_0]',
        'cursor-pointer text-[80%]',
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
};
