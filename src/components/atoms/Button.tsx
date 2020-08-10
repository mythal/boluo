import { css } from '@emotion/core';
import {
  baseLineHeight,
  controlRounded,
  dangerColor,
  disabled,
  focusShadow,
  normalColor,
  onDisabled,
  onHover,
  primaryColor,
  pX,
  pY,
  spacingN,
  textBase,
  textSm,
  uiShadow,
} from '@/styles/atoms';
import { lighten } from 'polished';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';

const btnTextShadow = '0 1px 0 rgba(0, 0, 0, 0.125)';

const btnColor = (color: string) => css`
  background-color: ${color};
  border-color: ${lighten(0.075, color)};
`;

interface DataAttributes {
  'data-variant'?: 'normal' | 'danger' | 'primary' | 'dark';
  'data-icon'?: boolean;
  'data-small'?: boolean;
}

export const buttonStyle = css`
  ${baseLineHeight};
  display: inline-flex;
  justify-content: space-around;
  align-items: center;
  min-width: 5em;
  user-select: none;
  cursor: pointer;
  border: 1px solid;
  color: white;
  text-shadow: ${btnTextShadow};
  text-decoration: none;
  transition-property: all;
  transition-duration: 0.2s;
  transition-timing-function: ease-in;
  ${[uiShadow, controlRounded, textBase]};

  & svg {
    filter: drop-shadow(${btnTextShadow});
  }

  &:hover {
    filter: brightness(110%);
  }

  &:active,
  &:focus:active {
    filter: brightness(80%);
    transform: translateY(1px);
  }

  &:focus {
    ${focusShadow};
  }

  padding: ${spacingN(2)} ${spacingN(3)};

  ${btnColor(normalColor)};

  &[data-variant='primary'] {
    ${btnColor(primaryColor)};
  }

  &[data-variant='danger'] {
    ${btnColor(dangerColor)};
  }

  &[data-variant='dark'] {
    ${btnColor('#1d1d1d')};
  }

  &[data-icon='true'] {
    min-width: unset;
  }

  &[data-small='true'] {
    ${[textSm, pX(1.75), pY(1.25)]};
  }

  ${onDisabled(disabled, onHover(disabled), { cursor: 'default' })};
`;

export const ButtonLink = styled(Link)<DataAttributes>(buttonStyle);

const Button = styled.button<DataAttributes>(buttonStyle);

export default Button;
