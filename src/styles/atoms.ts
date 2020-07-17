import { css, Interpolation, keyframes } from '@emotion/core';
import { transparentize } from 'polished';
import { uiShadowColor } from './theme';

export const onDisabled = (...styles: Interpolation[]) =>
  css`
    &:disabled {
      ${css(styles)};
    }
  `;
export const onHover = (...styles: Interpolation[]) =>
  css`
    &:hover {
      ${css(styles)};
    }
  `;
export const onFocus = (...styles: Interpolation[]) =>
  css`
    &:focus {
      ${css(styles)};
    }
  `;
export const onActive = (...styles: Interpolation[]) =>
  css`
    &:active {
      ${css(styles)};
    }
  `;

export const spinFrames = keyframes`
  100% {
    // https://stackoverflow.com/a/13293044
    transform: rotate(360deg) translateZ(0);
  }
`;

export const spin = css`
  animation: ${spinFrames} 1.5s linear infinite;
`;

export const focusOutline = css`
  outline: none;
  box-shadow: 0 0 0 2px ${transparentize(0.6, '#FFFFFF')};
`;

export const roundedPx = css`
  border-radius: 1px;
`;

export const disabled = css`
  filter: grayscale(80%) brightness(80%) contrast(30%);
  cursor: not-allowed;
  box-shadow: none;
`;

export const focused = css`
  filter: brightness(150%);
  outline: none;
`;

export const border = (color: string, width = '1px') => css`
  border: ${width} solid ${color};
`;

export const uiShadow = css`
  box-shadow: 0 0 4px 0 ${transparentize(0.6, uiShadowColor)}, 0 1px 1px 0 ${uiShadowColor};
`;
export const controlRounded = roundedPx;

export const duration200 = css`
  transition-duration: 200ms;
`;
