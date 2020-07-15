import * as React from 'react';
import { SpriteSymbol } from '*.svg';
import { css } from '@emotion/core';
import TextIcon from './TextIcon';
import { menuBgColor, menuItemHoverColor, menuShadowColor, spacingN } from '../../styles/theme';
import { roundedPx } from '../../styles/atoms';

export interface IMenuItem {
  text: string;
  icon?: SpriteSymbol;
  callback?: () => void;
}

interface Props {
  items: IMenuItem[];
}

const menuItemStyle = css`
  display: flex;
  justify-content: space-between;
  padding: ${spacingN(2)} ${spacingN(2.5)};
  ${roundedPx}

  &:hover {
    background-color: ${menuItemHoverColor};
  }
`;

function MenuItem({ text, icon, callback }: IMenuItem) {
  return (
    <div css={menuItemStyle}>
      <span>{text}</span>
      {icon && <TextIcon sprite={icon} />}
    </div>
  );
}

const menuStyle = css`
  background-color: ${menuBgColor};
  padding: ${spacingN(4)} ${spacingN(2)};
  width: ${spacingN(48)};
  ${roundedPx};
  box-shadow: 0 0 8px ${menuShadowColor};
`;

function Menu({ items }: Props) {
  return (
    <div css={menuStyle}>
      {items.map((props, index) => (
        <MenuItem key={index} {...props} />
      ))}
    </div>
  );
}

export default Menu;
