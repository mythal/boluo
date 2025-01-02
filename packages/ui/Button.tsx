import clsx from 'clsx';
import { ChevronDown } from '@boluo/icons';
import React from 'react';

interface ExtendedButtonProps {
  small?: boolean;
  variant?: 'primary' | 'default' | 'switch' | 'danger' | 'detail';
  on?: boolean;
  active?: boolean;
}

export type ButtonProps = React.ComponentPropsWithoutRef<'button'> & ExtendedButtonProps;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, variant = 'default', small = false, on, active, ...props }: ButtonProps,
  ref,
) {
  return (
    <button
      className={clsx(
        'Button enabled:cursor-pointer disabled:cursor-not-allowed',
        'select-none appearance-none focus-visible:outline-none',
        'inline-flex items-center justify-center',
        'm-0 gap-1 rounded-sm',
        'active-enabled:shadow-none active-enabled:translate-y-px border shadow-sm',

        small ? 'min-h-[1.75rem] px-[0.75rem] py-0.5 text-sm' : 'px-4 py-2 text-base',
        (variant === 'default' || variant === 'detail') && [
          'bg-button-default-bg text-button-default-text',
          'hover:enabled:bg-button-default-hover-bg active-enabled:bg-button-default-active-bg',
          'disabled:text-button-default-disabled-text disabled:bg-button-default-disabled-bg',
          'border-button-default-border',
        ],
        variant === 'danger' && [
          'bg-button-danger-bg text-button-danger-text hover:enabled:bg-button-danger-hover-bg',
          'active-enabled:bg-button-danger-active-bg border-button-danger-border',
        ],

        variant === 'primary' && [
          'bg-button-primary-bg text-button-primary-text',
          'hover:enabled:bg-button-primary-hover-bg active-enabled:bg-button-primary-active-bg',
          'disabled:bg-button-primary-disabled-bg disabled:text-button-primary-text',
          'border-button-primary-border',
        ],
        variant === 'switch' && [
          'bg-button-switch-bg text-button-switch-text',
          'hover:enabled:bg-button-switch-hover-bg active-enabled:bg-button-switch-active-bg',
          'border-r-1 border-r-button-switch-off-hint',
          'on:border-r-button-switch-on-hint on:bg-button-switch-on-bg on:hover:enabled:to-button-switch-bg',
          'disabled:text-button-switch-disabled-text disabled:bg-button-switch-disabled-bg',
          'border-button-switch-border-border',
        ],
        className,
      )}
      data-on={on}
      data-active={active}
      aria-pressed={variant === 'switch' ? Boolean(on) : undefined}
      ref={ref}
      {...props}
    >
      {children}
      {variant === 'detail' && (
        <span
          data-on={on}
          className="duration-1500 text-button-switch-detail-icon transform transition-transform data-[on=true]:rotate-180"
        >
          <ChevronDown />
        </span>
      )}
    </button>
  );
});
Button.displayName = 'Button';
