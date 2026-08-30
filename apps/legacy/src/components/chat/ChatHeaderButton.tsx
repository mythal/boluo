import * as React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { cls } from '../../utils/classnames';

export const chatHeaderButtonClassName =
  'legacy-chat-header-button inline-flex max-w-24 shrink-0 cursor-pointer items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[1px] border-0 bg-legacy-gray-700 px-2 py-1.5 text-legacy-text no-underline transition-all duration-[120ms] ease-in-out hover:bg-[rgba(255,255,255,0.25)] active:bg-legacy-gray-900 data-[active=true]:bg-legacy-gray-900 aria-[current=page]:bg-legacy-gray-900 focus:outline-none md:max-w-32';

export const sidebarIconButtonClassName =
  'inline-flex size-10 items-center justify-center text-[1.125rem]';

export function ChatHeaderButton({
  className,
  type = 'button',
  ref,
  ...props
}: React.ComponentPropsWithRef<'button'>) {
  return (
    <button
      className={cls(chatHeaderButtonClassName, className)}
      ref={ref}
      type={type}
      {...props}
    />
  );
}

export function ChatHeaderButtonLink({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof Link>) {
  return <Link className={cls(chatHeaderButtonClassName, className)} ref={ref} {...props} />;
}

interface ChatHeaderButtonNavLinkProps extends Omit<
  React.ComponentPropsWithRef<typeof NavLink>,
  'className'
> {
  className?: string;
}

export function ChatHeaderButtonNavLink({
  className,
  ref,
  ...props
}: ChatHeaderButtonNavLinkProps) {
  return <NavLink className={cls(chatHeaderButtonClassName, className)} ref={ref} {...props} />;
}

export default ChatHeaderButton;
