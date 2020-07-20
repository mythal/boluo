import { css, Interpolation, keyframes } from '@emotion/core';
import { darken, lighten, transparentize } from 'polished';

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

export const mediaQuery = (breakPoint: number, ...styles: Interpolation[]) =>
  css`
    @media (min-width: ${breakPoint}px) {
      ${css(styles)}
    }
  `;

export const sm = (...styles: Interpolation[]) => mediaQuery(640, styles);
export const md = (...styles: Interpolation[]) => mediaQuery(768, styles);
export const lg = (...styles: Interpolation[]) => mediaQuery(1024, styles);
export const xl = (...styles: Interpolation[]) => mediaQuery(1280, styles);

export const spinFrames = keyframes`
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
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

export const spacing = '0.25rem';
export const spacingN = (n: number): string => `calc(${spacing} * ${n})`;
export const bgColor = '#292929';
export const textColor = '#dddddd';
export const darkTextColor = '#242424';
export const uiShadowColor = '#000000';
export const textBase = css`
  font-size: 1rem;
`;
export const textXs = css`
  font-size: 0.75rem;
`;
export const textSm = css`
  font-size: 0.875rem;
`;
export const textLg = css`
  font-size: 1.125rem;
`;
export const textXl = css`
  font-size: 1.25rem;
`;
export const text2Xl = css`
  font-size: 1.5rem;
`;
export const text3Xl = css`
  font-size: 1.875rem;
`;
export const fontSans = 'system-ui, -apple-system, sans-serif';
export const fontBase = fontSans;
export const infoColor = '#45675e';
export const warnColor = '#307830';
export const errorColor = '#711518';
export const normalColor = '#555555';
export const successColor = '#2F855A';
export const lineColor = lighten(0.35, normalColor);
export const primaryColor = '#616625';
export const dangerColor = '#9a4444';
export const inputBgColor = lighten(0.1, bgColor);
export const inputBorderColor = '#555555';
export const headerBgColor = '#333333';
export const linkColor = lighten(0.2, primaryColor);
export const headerHeight = spacingN(12);
export const sidebarMinWidth = spacingN(48);
export const sidebarMaxWidth = '20%';
export const menuBgColor = '#000000';
export const menuShadowColor = 'rgba(0,0,0,0.56)';
export const menuItemHoverColor = darken(0.1, primaryColor);
export const closeButtonHoverColor = 'rgba(255,255,255,0.2)';
export const closeButtonActiveColor = 'rgba(255,255,255,0.4)';
export const overlayZIndex = 20;
export const modalZIndex = 40;
export const modalMaskColor = 'rgba(0,0,0,0.5)';
export const dialogBgColor = '#343434';
export const dialogTitleColor = darken(0.3, textColor);
export const dialogHeaderBgColor = darken(0.075, dialogBgColor);
export const baseStyle = css`
  html {
    font-size: 14px;
    font-family: ${fontBase};
    background-color: ${bgColor};
    color: ${textColor};
    line-height: 1.8em;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: normal;
    ${textBase};
    padding: 0;
    margin: 0;
    line-height: 1.8em;
  }
`;
export const mainWidth = css`
  max-width: 50em;
`;
export const uiShadow = css`
  box-shadow: 0 0 4px 0 ${transparentize(0.6, uiShadowColor)}, 0 1px 1px 0 ${uiShadowColor};
`;
export const controlRounded = roundedPx;

export const duration200 = css`
  transition-duration: 200ms;
`;

export const color = (color: string) =>
  css`
    color: ${color};
  `;

export const margin0Auto = css`
  margin: 0 auto;
`;

export const p = (n: number) => css`
  padding-top: ${spacingN(n)};
  padding-right: ${spacingN(n)};
  padding-bottom: ${spacingN(n)};
  padding-left: ${spacingN(n)};
`;
export const pX = (n: number) =>
  css`
    padding-left: ${spacingN(n)};
    padding-right: ${spacingN(n)};
  `;
export const pY = (n: number) =>
  css`
    padding-top: ${spacingN(n)};
    padding-bottom: ${spacingN(n)};
  `;
export const pL = (n: number) =>
  css`
    padding-left: ${spacingN(n)};
  `;
export const pR = (n: number) =>
  css`
    padding-right: ${spacingN(n)};
  `;
export const pT = (n: number) =>
  css`
    padding-top: ${spacingN(n)};
  `;
export const pB = (n: number) =>
  css`
    padding-bottom: ${spacingN(n)};
  `;

export const m = (n: number) => css`
  margin-top: ${spacingN(n)};
  margin-right: ${spacingN(n)};
  margin-bottom: ${spacingN(n)};
  margin-left: ${spacingN(n)};
`;
export const mX = (n: number) =>
  css`
    margin-left: 0 ${spacingN(n)};
    margin-right: ${spacingN(n)};
  `;
export const mY = (n: number) =>
  css`
    margin-top: ${spacingN(n)};
    margin-bottom: ${spacingN(n)};
  `;
export const mL = (n: number) =>
  css`
    margin-left: ${spacingN(n)};
  `;
export const mR = (n: number) =>
  css`
    margin-right: ${spacingN(n)};
  `;
export const mT = (n: number) =>
  css`
    margin-top: ${spacingN(n)};
  `;
export const mB = (n: number) =>
  css`
    margin-bottom: ${spacingN(n)};
  `;

export const link = css`
  color: ${linkColor};
  text-decoration: none;

  &:hover {
    border-bottom: 0.1em solid ${linkColor};
  }
`;

export const hidden = css`
  display: none;
`;
export const flex = css`
  display: flex;
`;
export const inline = css`
  display: inline;
`;
export const block = css`
  display: block;
`;
export const inlineBlock = css`
  display: inline-block;
`;

export const alignCenter = css`
  text-align: center;
`;
export const alignRight = css`
  text-align: right;
`;
export const alignLeft = css`
  text-align: left;
`;
export const fontBold = css`
  font-weight: bold;
`;

export const floatLeft = css`
  float: left;
`;
export const floatRight = css`
  float: right;
`;
