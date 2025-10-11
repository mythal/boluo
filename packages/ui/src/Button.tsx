import clsx from 'clsx';
import { ChevronDown } from '@boluo/icons';
import React from 'react';

interface ExtendedButtonProps {
  small?: boolean;
  variant?: 'primary' | 'default' | 'switch' | 'danger' | 'detail';
  on?: boolean;
  active?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export type ButtonProps = React.ComponentPropsWithoutRef<'button'> & ExtendedButtonProps;

export const Button: React.FC<ButtonProps> = function Button({
  children,
  className,
  variant = 'default',
  small = false,
  on,
  active,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'Button enabled:cursor-pointer disabled:cursor-not-allowed',
        'appearance-none select-none focus-visible:outline-none',
        'ring-border-focus/75 inline-flex items-center justify-center focus:ring',
        'm-0 gap-1 rounded-sm',
        small ? 'min-h-[1.75rem] px-[0.75rem] py-0.5 text-sm' : 'px-4 py-2 text-base',
        (variant === 'default' || variant === 'detail') && [
          'bg-action-secondary-bg text-action-secondary-text',
          'hover:enabled:bg-action-secondary-bg-hover active:enabled:bg-action-secondary-bg-active',
          'disabled:text-text-inverted-secondary disabled:bg-action-secondary-bg-disabled',
        ],
        variant === 'danger' && [
          'bg-action-danger-bg text-action-primary-text hover:enabled:bg-action-danger-bg-hover active:enabled:bg-action-danger-bg-active',
          'disabled:bg-action-danger-bg-disabled disabled:text-text-inverted-secondary',
        ],
        variant === 'primary' && [
          'bg-action-primary-bg text-action-primary-text',
          'hover:enabled:bg-action-primary-bg-hover active:enabled:bg-action-primary-bg-active',
          'disabled:bg-action-primary-bg-disabled disabled:text-text-inverted-secondary',
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
          className="text-action-toggle-icon transform transition-transform duration-1500 data-[on=true]:rotate-180"
        >
          <ChevronDown />
        </span>
      )}
    </button>
  );
};
