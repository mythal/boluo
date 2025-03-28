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
        'bg-button-inline-bg inline-block -translate-y-[1px] rounded px-[0.5em] transition-shadow duration-100 active:translate-y-0',
        'shadow-button-inline-border/50 active:shadow-button-inline-border/25 shadow-[0_2px_0_0] active:shadow-[0_0px_0_1px]',
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
};
