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
        'ButtonInline inline-block -translate-y-[1px] rounded-sm px-[0.5em] transition-shadow duration-100 active:translate-y-0',
        'bg-action-secondary-bg shadow-border-default ring-border-focus/75 focus:ring',
        'hover:bg-action-secondary-bg-hover pressed:bg-action-secondary-bg-active',
        'active:shadow-border-strong/25 shadow-[0_1px_0_0] active:shadow-[0_0px_0_1px]',
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
};
