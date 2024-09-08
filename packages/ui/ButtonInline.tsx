import clsx from 'clsx';
import React from 'react';

interface ExtendedButtonInlineProps {
  variant?: 'primary' | 'default';
}

export type ButtonInlineProps = React.ComponentPropsWithoutRef<'button'> & ExtendedButtonInlineProps;

export const ButtonInline = React.forwardRef<HTMLButtonElement, ButtonInlineProps>(function ButtonInline(
  { children, className, ...props }: ButtonInlineProps,
  ref,
) {
  return (
    <button
      className={clsx(
        className,
        'bg-button-inline-bg shadow-button-inline-border active:shadow-button-inline-border inline-block -translate-y-[1px] rounded-sm px-[0.5em] shadow-[0_0px_0_1px,_0_2px_0_0] active:translate-y-0 active:shadow-[0_0px_0_1px]',
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});
ButtonInline.displayName = 'ButtonInline';
