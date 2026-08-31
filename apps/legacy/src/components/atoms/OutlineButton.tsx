import React from 'react';
import { Link } from 'react-router-dom';
import { cls } from '../../utils/classnames';
import { type ButtonSize, type ButtonVariant } from './Button';

interface OutlineButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

const outlineButtonBaseClassName =
  'inline-flex cursor-pointer items-center justify-around rounded-[1px] border-[0.075em] border-solid text-legacy-text no-underline shadow-legacy-ui transition-all duration-120 ease-in hover:shadow-[0_0_4px_0_var(--color-legacy-ui-shadow-muted),0_1px_1px_0_var(--color-legacy-ui-shadow),inset_0_-0.2em_0_0_var(--color-legacy-brand-primary)] focus:outline-none focus:shadow-[0_0_0_2px_var(--color-legacy-focus-outline),0_0_4px_0_var(--color-legacy-ui-shadow-muted),0_1px_1px_0_var(--color-legacy-ui-shadow)] active:bg-legacy-outline-active active:shadow-[0_0_4px_0_var(--color-legacy-ui-shadow-muted),0_1px_1px_0_var(--color-legacy-ui-shadow),inset_0_-0.2em_0_0_var(--color-legacy-link)] disabled:cursor-default disabled:shadow-none disabled:[filter:grayscale(80%)_brightness(80%)_contrast(30%)]';

const outlineButtonSizeClassNames: Record<ButtonSize, string> = {
  normal: 'px-3 py-2 text-[1rem]',
  small: 'px-[0.4375rem] py-[0.3125rem] text-[0.875rem]',
  large: 'px-3 py-2 text-[1.125rem]',
};

const outlineButtonVariantClassNames: Record<ButtonVariant, string> = {
  normal: 'border-legacy-outline-border bg-legacy-outline-background',
  primary: 'border-legacy-outline-primary-border bg-legacy-brand-primary',
  danger: 'border-legacy-danger bg-legacy-outline-background',
  dark: 'border-legacy-outline-border bg-legacy-outline-background',
};

function getOutlineButtonClassName({
  className,
  variant = 'normal',
  size = 'normal',
  iconOnly = false,
}: OutlineButtonStyleProps & { className?: string }) {
  return cls(
    outlineButtonBaseClassName,
    outlineButtonSizeClassNames[size],
    outlineButtonVariantClassNames[variant],
    iconOnly ? 'min-w-[unset]' : 'min-w-[5em]',
    className,
  );
}

type OutlineButtonProps = React.ComponentPropsWithRef<'button'> & OutlineButtonStyleProps;

export function OutlineButton({
  className,
  variant,
  size,
  iconOnly,
  ref,
  ...props
}: OutlineButtonProps) {
  return (
    <button
      ref={ref}
      className={getOutlineButtonClassName({ className, variant, size, iconOnly })}
      {...props}
    />
  );
}

type OutlineButtonLinkProps = React.ComponentPropsWithRef<typeof Link> & OutlineButtonStyleProps;

export function OutlineButtonLink({
  className,
  variant,
  size,
  iconOnly,
  ref,
  ...props
}: OutlineButtonLinkProps) {
  return (
    <Link
      ref={ref}
      className={getOutlineButtonClassName({ className, variant, size, iconOnly })}
      {...props}
    />
  );
}
