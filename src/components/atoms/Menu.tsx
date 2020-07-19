import * as React from 'react';
import { SpriteSymbol } from '*.svg';
import { css, keyframes } from '@emotion/core';
import TextIcon from './Icon';
import { menuBgColor, menuItemHoverColor, spacingN } from '../../styles/theme';
import { roundedPx, uiShadow } from '../../styles/atoms';
import { lighten } from 'polished';

export interface IMenuItem {
  text: string;
  icon?: SpriteSymbol;
  disabled?: boolean;
  callback?: () => void;
}

interface Props {
  items: IMenuItem[];
  dismiss: () => void;
}

const menuItemStyle = css`
  display: flex;
  justify-content: space-between;
  padding: ${spacingN(2.5)} ${spacingN(2.5)};
  cursor: pointer;
  user-select: none;
  transition-property: background-color;
  transition-timing-function: ease-out;
  transition-duration: 200ms;
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

function MenuItem({ text, icon, callback, dismiss, disabled }: IMenuItem & Pick<Props, 'dismiss'>) {
  const onClick = () => {
    if (!disabled) {
      callback && callback();
      dismiss();
    }
  };
  return (
    <div css={menuItemStyle} onClick={onClick} data-disabled={disabled}>
      <span>{text}</span>
      {icon && <TextIcon sprite={icon} />}
    </div>
  );
}

const menuEnter = keyframes`
  60% {
    opacity: 100%;
  }
  100% {
    opacity: 100%;
    transform: translateY(0);
  }
`;

const menuStyle = css`
  background-color: ${menuBgColor};
  padding: ${spacingN(4)} ${spacingN(2)};
  width: ${spacingN(48)};
  ${roundedPx};
  opacity: 0;
  transform: translateY(-1rem);
  ${uiShadow};
  animation: ${menuEnter} 0.1s ease-in forwards;
`;

function Menu({ items, dismiss }: Props) {
  return (
    <div css={menuStyle}>
      {items.map((props, index) => (
        <MenuItem key={index} {...props} dismiss={dismiss} />
      ))}
    </div>
  );
}

export default Menu;
