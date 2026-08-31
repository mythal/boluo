import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { cls } from '../../utils/classnames';

interface Props extends Omit<React.ComponentPropsWithoutRef<typeof NavLink>, 'className' | 'end'> {
  exact?: boolean;
  className?: string;
}

export const headerLinkClassName =
  'inline-block max-w-32 cursor-pointer overflow-hidden rounded-[1px] border-0 bg-legacy-header-hover px-2 py-1.5 text-sm leading-[1.5em] text-ellipsis whitespace-nowrap text-legacy-text no-underline transition-all duration-[120ms] ease-in-out aria-[current=page]:bg-legacy-background hover:bg-legacy-header-active active:bg-legacy-header-deep focus:outline-none sm:max-w-64 lg:max-w-96';

export function HeaderButton({
  className,
  type = 'button',
  ref,
  ...props
}: React.ComponentPropsWithRef<'button'>) {
  return (
    <button
      className={cls(headerLinkClassName, 'legacy-header-button', className)}
      ref={ref}
      type={type}
      {...props}
    />
  );
}

function HeaderLink({ exact, className, ...props }: Props) {
  return <NavLink className={cls(headerLinkClassName, className)} end={exact} {...props} />;
}

export default HeaderLink;
