import React from 'react';
import { Link } from 'react-router-dom';
import { cls } from '../../utils/classnames';

export type ButtonVariant = 'normal' | 'danger' | 'primary' | 'dark';
export type ButtonSize = 'normal' | 'small' | 'large';

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

const buttonBaseClassName =
  'inline-flex min-h-[2em] cursor-pointer select-none items-center justify-around border-0 text-legacy-text no-underline shadow-[0_1px_0_0_var(--color-legacy-button-shadow)] transition-all duration-100 ease-in-out hover:brightness-90 focus:outline-none focus:shadow-[0_1px_0_0_var(--color-legacy-button-shadow),inset_0_0_0_1px_var(--color-legacy-button-focus)] active:translate-y-px active:brightness-[80%] active:shadow-[0_0_0_0_var(--color-legacy-button-shadow)] disabled:cursor-default disabled:shadow-none disabled:[filter:grayscale(80%)_brightness(80%)_contrast(30%)]';

const buttonSizeClassNames: Record<ButtonSize, string> = {
  normal: 'rounded-[5px] px-3 py-2 text-[1rem]',
  small: 'rounded-[3px] px-[0.4375rem] py-[0.3125rem] text-[0.875rem]',
  large: 'rounded-[5px] px-3 py-2 text-[1.125rem]',
};

const buttonVariantClassNames: Record<ButtonVariant, string> = {
  normal: 'bg-legacy-button',
  primary: 'bg-legacy-button-primary',
  danger: 'bg-legacy-button-danger',
  dark: 'bg-legacy-button-dark',
};

function getButtonClassName({
  className,
  variant = 'normal',
  size = 'normal',
  iconOnly = false,
}: ButtonStyleProps & { className?: string }) {
  return cls(
    buttonBaseClassName,
    buttonSizeClassNames[size],
    buttonVariantClassNames[variant],
    iconOnly ? 'min-w-[unset]' : 'min-w-[5em]',
    className,
  );
}

export type ButtonProps = React.ComponentPropsWithRef<'button'> & ButtonStyleProps;

function Button({ className, variant, size, iconOnly, ref, ...props }: ButtonProps) {
  return (
    <button
      ref={ref}
      className={getButtonClassName({ className, variant, size, iconOnly })}
      {...props}
    />
  );
}

type ButtonLinkProps = React.ComponentPropsWithRef<typeof Link> & ButtonStyleProps;

export function ButtonLink({ className, variant, size, iconOnly, ref, ...props }: ButtonLinkProps) {
  return (
    <Link
      ref={ref}
      className={getButtonClassName({ className, variant, size, iconOnly })}
      {...props}
    />
  );
}

export default Button;
