import clsx from 'clsx';
import ChevronDown from '@boluo/icons/ChevronDown';
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
  if (props.type == null) {
    props.type = 'button';
  }
  return (
    <button
      className={clsx(
        'Button enabled:cursor-pointer disabled:cursor-not-allowed',
        'appearance-none select-none focus-visible:outline-none',
        'ring-border-focus inline-flex items-center justify-center not-disabled:focus:ring',
        'm-0 gap-1 rounded-sm',
        'pressed:[&_.detail-arrow]:rotate-180',
        small ? 'min-h-7 px-3 py-0.5 text-sm' : 'px-4 py-2 text-base',
        'border',
        (variant === 'default' || variant === 'detail') && [
          'bg-action-secondary-bg border-action-secondary-border shadow-[0_-1px_0_var(--color-action-secondary-border)_inset,0_1px_3px_rgba(0,0,0,0.05)]',
          'hover:enabled:bg-action-secondary-bg-hover',
          'pressed:bg-action-secondary-bg-active pressed:shadow-[0_1px_0_0_var(--color-action-secondary-border)_inset] pressed:border-action-secondary-border',
          'disabled:text-text-inverted-secondary disabled:bg-action-secondary-bg-disabled',
        ],
        variant === 'danger' && [
          'bg-action-danger-bg text-action-primary-text border-action-danger-border hover:enabled:bg-action-danger-bg-hover shadow-[0_-1px_0_var(--color-action-danger-border)_inset,0_1px_3px_rgba(0,0,0,0.05)]',
          'pressed:bg-action-danger-bg-active pressed:border-b-action-danger-bg-active pressed:shadow-[0_1px_0_0_var(--color-action-danger-border)_inset]',
          'disabled:bg-action-danger-bg-disabled disabled:text-text-inverted-secondary',
        ],
        variant === 'primary' && [
          'bg-action-primary-bg text-action-primary-text border-action-primary-border shadow-[0_-1px_0_var(--color-action-primary-border)_inset,0_1px_3px_rgba(0,0,0,0.05)]',
          'hover:enabled:bg-action-primary-bg-hover',
          'pressed:bg-action-primary-bg-active pressed:shadow-[0_1px_0_0_var(--color-action-primary-border)_inset]',
          'disabled:bg-action-primary-bg-disabled disabled:text-text-inverted-secondary',
        ],
        className,
      )}
      data-active={active}
      aria-pressed={Boolean(on)}
      ref={ref}
      {...props}
    >
      {children}
      {variant === 'detail' && (
        <span
          data-active={active}
          className="detail-arrow text-action-toggle-icon transform transition-transform duration-100"
        >
          <ChevronDown />
        </span>
      )}
    </button>
  );
};
