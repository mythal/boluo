import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { lighten } from 'polished';
import { Link } from 'react-router-dom';
import {
  controlRounded,
  disabled,
  focusShadow,
  onDisabled,
  onHover,
  pX,
  pY,
  spacingN,
  textBase,
  textLg,
  textSm,
  uiShadow,
  uiShadowValue,
} from '../../styles/atoms';
import { dangerColor, primaryColor, textColor } from '../../styles/colors';

const btnColor = (color: string) =>
  css`
  background-color: ${color};
  border-color: ${lighten(0.075, color)};
`;

interface DataAttributes {
  'data-variant'?: 'normal' | 'danger' | 'primary' | 'dark';
  'data-icon'?: boolean;
  'data-size'?: 'normal' | 'small' | 'large';
}

export const outlineButtonStyle = css`
  background-color: rgba(255, 255, 255, 0.05);
  color: ${textColor};
  display: inline-flex;
  justify-content: space-around;
  align-items: center;
  min-width: 5em;
  cursor: pointer;
  text-decoration: none;
  transition-property: all;
  transition-duration: 120ms;
  transition-timing-function: ease-in;
  border: 0.075em solid rgba(255, 255, 255, 0.2);
  ${[uiShadow, controlRounded, textBase]};

  &:hover {
    box-shadow: ${uiShadowValue}, 0 -0.2em 0 0 ${primaryColor} inset;
  }

  &:active,
  &:focus:active {
    background-color: rgba(255, 255, 255, 0.1);
    box-shadow: ${uiShadowValue}, 0 -0.2em 0 0 ${lighten(0.2, primaryColor)} inset;
  }

  &:focus {
    ${focusShadow};
  }

  padding: ${spacingN(2)} ${spacingN(3)};

  &[data-variant='primary'] {
    ${btnColor(primaryColor)};
  }

  &[data-variant='danger'] {
    border-color: ${dangerColor};
  }

  &[data-icon='true'] {
    min-width: unset;
  }

  &[data-size='small'] {
    ${[textSm, pX(1.75), pY(1.25)]};
  }

  &[data-size='large'] {
    ${[textLg, pX(3), pY(2)]};
  }

  ${onDisabled(disabled, onHover(disabled), { cursor: 'default' })};
`;

export const OutlineButton = styled.button<DataAttributes>(outlineButtonStyle);
export const OutlineButtonLink = styled(Link)<DataAttributes>(outlineButtonStyle);
