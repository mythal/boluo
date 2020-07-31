import { SpriteSymbol } from '*.svg';
import { css } from '@emotion/core';
import { menuItemHoverColor, roundedPx, spacingN, textColor } from '@/styles/atoms';
import { lighten } from 'polished';
import TextIcon from '@/components/atoms/Icon';
import * as React from 'react';
import { Link } from 'react-router-dom';
import styled from '@emotion/styled';

export interface IMenuItem {
  children: React.ReactNode;
  icon?: SpriteSymbol;
  onClick?: () => void;
}

const menuItemStyle = css`
  display: flex;
  text-decoration: none;
  color: ${textColor};
  justify-content: space-between;
  padding: ${spacingN(2.5)} ${spacingN(2.5)};
  cursor: pointer;
  user-select: none;
  transition-property: background-color;
  transition-timing-function: ease-out;
  transition-duration: 100ms;
  ${roundedPx}
  &:hover {
    background-color: ${menuItemHoverColor};
  }
  &:active {
    background-color: ${lighten(0.15, menuItemHoverColor)};
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

export const MenuItemLinkContainer = styled(Link)(menuItemStyle);

export const MenuItemContainer = styled.div(menuItemStyle);

export function MenuItem({ children, icon, onClick }: IMenuItem) {
  return (
    <MenuItemContainer onClick={onClick}>
      <div>{children}</div>
      {icon && <TextIcon sprite={icon} />}
    </MenuItemContainer>
  );
}

export interface IMenuItemLink {
  children: React.ReactNode;
  icon?: SpriteSymbol;
  to: string;
}

export function MenuItemLink({ children, icon, to }: IMenuItemLink) {
  return (
    <MenuItemLinkContainer to={to}>
      <div>{children}</div>
      {icon && <TextIcon sprite={icon} />}
    </MenuItemLinkContainer>
  );
}

export interface IMenuItemDisabled {
  children: React.ReactNode;
  icon?: SpriteSymbol;
}

export function MenuItemDisabled({ children, icon }: IMenuItemDisabled) {
  return (
    <MenuItemContainer data-disabled={true} onClick={(e) => e.stopPropagation()}>
      <div>{children}</div>
      {icon && <TextIcon sprite={icon} />}
    </MenuItemContainer>
  );
}
