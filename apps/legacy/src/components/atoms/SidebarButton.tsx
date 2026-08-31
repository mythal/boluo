import * as React from 'react';
import { cls } from '../../utils/classnames';

const sidebarButtonClassName =
  'cursor-pointer rounded-[1px] border-0 bg-transparent p-1.5 text-legacy-text no-underline hover:bg-[rgba(255,255,255,0.25)] active:bg-[rgba(255,255,255,0.15)] data-[active=true]:bg-[rgba(255,255,255,0.15)] focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--color-legacy-focus-outline)]';

export function SidebarButton({
  className,
  type = 'button',
  ref,
  ...props
}: React.ComponentPropsWithRef<'button'>) {
  return (
    <button className={cls(sidebarButtonClassName, className)} ref={ref} type={type} {...props} />
  );
}
