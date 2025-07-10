import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { darken } from 'polished';
import * as React from 'react';
import { NavLink } from 'react-router-dom';
import TextIcon, { type SvgIcon } from '../../components/atoms/Icon';
import { mY, roundedSm, spacingN } from '../../styles/atoms';
import { menuItemHoverColor, textColor } from '../../styles/colors';

export interface IMenuItem {
  children: React.ReactNode;
  icon?: SvgIcon;
  onClick?: () => void;
}

const menuItemStyle = css`
  display: flex;
  text-decoration: none;
  color: ${textColor};
  justify-content: space-between;
  padding: ${spacingN(2)} ${spacingN(2.5)};
  ${mY(1)};
  cursor: pointer;
  user-select: none;
  transition-property: background-color;
  transition-timing-function: ease-out;
  transition-duration: 100ms;
  ${roundedSm}
  &:hover {
    background-color: ${menuItemHoverColor};
  }
  &.active,
  &:active {
    background-color: ${darken(0.15, menuItemHoverColor)};
  }
  &[data-disabled='true'] {
    cursor: not-allowed;
    filter: brightness(50%);
    &:hover,
    &:active {
      background-color: transparent;
    }
  }
`;

export const MenuItemLinkContainer = styled(NavLink)(menuItemStyle);

export const MenuItemContainer = styled.div(menuItemStyle);

export function MenuItem({ children, icon, onClick }: IMenuItem) {
  return (
    <MenuItemContainer onClick={onClick}>
      <div>{children}</div>
      {icon && <TextIcon icon={icon} />}
    </MenuItemContainer>
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
    <MenuItemLinkContainer
      to={to}
      end={exact}
      className={({ isActive }) => (isActive ? 'active' : '')}
    >
      <div>{children}</div>
      {icon && <TextIcon icon={icon} />}
    </MenuItemLinkContainer>
  );
}

export interface IMenuItemDisabled {
  children: React.ReactNode;
  icon?: SvgIcon;
}

export function MenuItemDisabled({ children, icon }: IMenuItemDisabled) {
  return (
    <MenuItemContainer data-disabled={true} onClick={(e) => e.stopPropagation()}>
      <div>{children}</div>
      {icon && <TextIcon icon={icon} />}
    </MenuItemContainer>
  );
}
