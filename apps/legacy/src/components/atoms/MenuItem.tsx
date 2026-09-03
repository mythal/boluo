import * as React from 'react';
import { NavLink } from 'react-router-dom';
import TextIcon, { type SvgIcon } from '../../components/atoms/Icon';
import { cls } from '../../utils/classnames';

export interface IMenuItem {
  children: React.ReactNode;
  icon?: SvgIcon;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const menuItemClassName =
  'my-1 flex cursor-pointer select-none justify-between rounded-[3px] px-2.5 py-2 text-legacy-text no-underline transition-colors duration-100 ease-out hover:bg-legacy-menu-item-hover active:bg-legacy-menu-item-active data-[disabled=true]:cursor-not-allowed data-[disabled=true]:brightness-50 data-[disabled=true]:hover:bg-transparent data-[disabled=true]:active:bg-transparent';

export function MenuItem({ children, icon, onClick }: IMenuItem) {
  return (
    <div className={menuItemClassName} onClick={onClick}>
      <div>{children}</div>
      {icon && <TextIcon icon={icon} />}
    </div>
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
      <div>{children}</div>
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
    <div
      className={menuItemClassName}
      data-disabled={true}
      onClick={(event) => event.stopPropagation()}
    >
      <div>{children}</div>
      {icon && <TextIcon icon={icon} />}
    </div>
  );
}
