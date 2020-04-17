import { css, Interpolation, keyframes } from '@emotion/core';
import { bgColor } from './theme';

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
    transform: rotate(360deg);
  }
`;

export const spin = css`
  animation: ${spinFrames} 1.5s linear infinite;
`;

export const focusOutline = css`
  outline: none;
  box-shadow: 0 0 0 1px ${bgColor}, 0 0 0 2px rgba(255, 255, 255, 0.5), 0 0 0 3px ${bgColor};
`;
