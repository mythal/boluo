import * as React from 'react';
import { css } from '@emotion/core';
import { spacingN, textSm } from '../../styles/theme';
import { focusOutline, onDisabled, onFocus, onHover } from '../../styles/atoms';
import { lighten } from 'polished';

const normalColor = '#555555';
const primaryColor = '#7c842d';
const dangerColor = '#9c4f4f';
const disableFilter = css`
  filter: grayscale(80%) brightness(80%) contrast(30%);
`;
const btnTextShadow = '0 1px 0 rgba(0, 0, 0, 0.125)';

const btnColor = (color: string) => css`
  background-color: ${color};
  border-color: ${lighten(0.04, color)};
`;

const btn = css`
  // display: inline-flex;
  // justify-content: space-around;
  // grid-template-columns: repeat(auto-fill, auto);
  min-width: 5em;
  position: relative;
  user-select: none;
  cursor: pointer;
  border: 1px solid;
  border-radius: 1px;
  color: white;
  text-shadow: ${btnTextShadow};
  transition-property: all;
  transition-duration: 0.1s;
  transition-timing-function: ease-in;

  & svg {
    filter: drop-shadow(${btnTextShadow});
  }

  &:hover {
    filter: brightness(110%);
  }

  &:active {
    filter: brightness(95%);
  }

  padding: ${spacingN(2.5)} ${spacingN(3)};

  ${btnColor(normalColor)};

  &[data-btn='primary'] {
    ${btnColor(primaryColor)};
  }

  &[data-btn='danger'] {
    ${btnColor(dangerColor)};
  }

  &[data-icon='true'] {
    min-width: unset;
  }

  &[data-small='true'] {
    font-size: ${textSm};
  }

  ${onFocus(focusOutline, { zIndex: 1 })};

  ${onDisabled(disableFilter, onHover(disableFilter), { cursor: 'default' })};
`;

interface Props {
  type?: 'normal' | 'danger' | 'primary';
  iconOnly?: boolean;
  small?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export default function Button({ children, iconOnly, small, type, onClick, disabled }: Props) {
  const handleClick: React.MouseEventHandler = () => {
    if (onClick) {
      onClick();
    }
  };
  return (
    <button css={btn} data-icon={iconOnly} data-btn={type} data-small={small} onClick={handleClick} disabled={disabled}>
      {children}
    </button>
  );
}
