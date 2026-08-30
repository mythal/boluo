import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { cls } from '../../utils/classnames';

interface Props extends Omit<React.ComponentPropsWithRef<typeof NavLink>, 'className'> {
  className?: string;
  multiline?: boolean;
}

const sidebarItemClassName =
  'flex w-[200px] shrink-0 grow-0 overflow-hidden px-4 pl-8 text-ellipsis whitespace-nowrap break-all text-legacy-sidebar-item no-underline hover:bg-legacy-sidebar-item-hover-background active:bg-legacy-sidebar-item-active-background active:shadow-[inset_4px_0_0_0_var(--color-legacy-brand-primary)] aria-[current=page]:bg-legacy-sidebar-item-active-background aria-[current=page]:shadow-[inset_4px_0_0_0_var(--color-legacy-brand-primary)]';

export function SidebarItemLink({ className, multiline = false, ref, ...props }: Props) {
  return (
    <NavLink
      className={cls(
        sidebarItemClassName,
        multiline ? 'h-fit flex-col items-start py-3' : 'h-10 items-center',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}
