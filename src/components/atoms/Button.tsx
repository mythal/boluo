import { css } from '@emotion/core';
import {
  baseLineHeight,
  disabled,
  onDisabled,
  onHover,
  pX,
  pY,
  roundedSm,
  spacingN,
  textBase,
  textLg,
  textSm,
} from '../../styles/atoms';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { buttonColor, buttonDangerColor, buttonDarkColor, buttonPrimaryColor, textColor } from '../../styles/colors';

export const buttonShadowColor = 'rgba(0, 0, 0, 0.2)';

export const focusShadowColor = 'rgba(255, 255, 255, 0.3)';

export const focusShadow = `0 0 0 1px ${focusShadowColor} inset`;

export const buttonShadow = `0 1px 0 0 ${buttonShadowColor}`;

const btnColor = (color: string) => css`
  background-color: ${color};
`;

export type ButtonVariant = 'normal' | 'danger' | 'primary' | 'dark';

interface DataAttributes {
  'data-variant'?: ButtonVariant;
  'data-icon'?: boolean;
  'data-small'?: boolean;
  'data-size'?: 'large' | 'normal' | 'small';
}

export const buttonStyle = css`
  ${baseLineHeight};
  display: inline-flex;
  justify-content: space-around;
  align-items: center;
  min-height: 2em;
  min-width: 5em;
  user-select: none;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: ${textColor};
  text-decoration: none;
  transition-property: all;
  transition-duration: 100ms;
  box-shadow: ${buttonShadow};
  transition-timing-function: ease-in-out;

  ${[textBase]};

  &:hover {
    filter: brightness(90%);
  }

  &:active,
  &:focus:active {
    filter: brightness(80%);
    transform: translateY(1px);
    box-shadow: 0 0 0 0 ${buttonShadowColor};
  }

  &:focus {
    outline: none;
    box-shadow: ${buttonShadow} ${focusShadow};
  }

  padding: ${spacingN(2)} ${spacingN(3)};

  ${btnColor(buttonColor)};

  &[data-variant='primary'] {
    ${btnColor(buttonPrimaryColor)};
  }

  &[data-variant='danger'] {
    ${btnColor(buttonDangerColor)};
  }

  &[data-variant='dark'] {
    ${btnColor(buttonDarkColor)};
  }

  &[data-icon='true'] {
    min-width: unset;
  }

  &[data-size='small'],
  &[data-small='true'] {
    ${[textSm, pX(1.75), pY(1.25), roundedSm]};
  }
  &[data-size='large'] {
    ${textLg};
  }

  ${onDisabled(disabled, onHover(disabled), { cursor: 'default' })};
`;

export const ButtonLink = styled(Link)<DataAttributes>(buttonStyle);

const Button = styled.button<DataAttributes>(buttonStyle);

export default Button;
