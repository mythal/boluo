import * as React from 'react';
import { NavLink } from 'react-router-dom';
import TextIcon, { type SvgIcon } from '../../components/atoms/Icon';
import { cls } from '../../utils/classnames';

export interface IMenuItem {
  children: React.ReactNode;
  icon?: SvgIcon;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const menuItemClassName =
  'my-1 flex cursor-pointer select-none justify-between rounded-[3px] px-2.5 py-2 text-legacy-text no-underline transition-colors duration-100 ease-out hover:bg-legacy-menu-item-hover active:bg-legacy-menu-item-active';

const menuItemButtonClassName =
  'legacy-menu-item-button w-full border-0 bg-transparent text-left disabled:cursor-not-allowed disabled:brightness-50 disabled:hover:bg-transparent disabled:active:bg-transparent';

export function MenuItem({ children, icon, onClick }: IMenuItem) {
  return (
    <button
      type="button"
      className={cls(menuItemClassName, menuItemButtonClassName)}
      onClick={onClick}
    >
      <span>{children}</span>
      {icon && <TextIcon icon={icon} />}
    </button>
  );
}

export interface IMenuItemLink {
  children: React.ReactNode;
  icon?: SvgIcon;
  to: string;
  exact?: boolean;
}

export function MenuItemLink({ children, icon, to, exact }: IMenuItemLink) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) => cls(menuItemClassName, isActive && 'bg-legacy-menu-item-active')}
    >
      <span>{children}</span>
      {icon && <TextIcon icon={icon} />}
    </NavLink>
  );
}

export interface IMenuItemDisabled {
  children: React.ReactNode;
  icon?: SvgIcon;
}

export function MenuItemDisabled({ children, icon }: IMenuItemDisabled) {
  return (
    <button type="button" className={cls(menuItemClassName, menuItemButtonClassName)} disabled>
      <span>{children}</span>
      {icon && <TextIcon icon={icon} />}
    </button>
  );
}
