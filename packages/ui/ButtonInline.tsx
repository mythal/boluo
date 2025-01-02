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
        'ButtonInline bg-button-inline-bg inline-block -translate-y-[1px] rounded-sm px-[0.3em] transition-shadow duration-100 active:translate-y-0',
        'shadow-[0_0_0_1px_rgba(0,0,0,1),0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-[0_0_0_1px_rgba(0,0,0,1)]',
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});
ButtonInline.displayName = 'ButtonInline';
