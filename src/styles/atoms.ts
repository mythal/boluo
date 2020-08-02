import { css, Interpolation, keyframes } from '@emotion/core';
import { darken, lighten, mix, transparentize } from 'polished';
import { Theme } from 'react-select';

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

export const mediaQuery = (breakPoint: string) => `@media (min-width: ${breakPoint})`;

export const responsive = (breakPoint: string, ...styles: Interpolation[]) =>
  css`
    ${mediaQuery(breakPoint)} {
      ${css(styles)}
    }
  `;
export const breakpoint = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
};

export const sm = (...styles: Interpolation[]) => responsive(breakpoint.sm, styles);
export const md = (...styles: Interpolation[]) => responsive(breakpoint.md, styles);
export const lg = (...styles: Interpolation[]) => responsive(breakpoint.lg, styles);
export const xl = (...styles: Interpolation[]) => responsive(breakpoint.xl, styles);

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

export const roundedPx = css`
  border-radius: 1px;
`;

export const disabled = css`
  filter: grayscale(80%) brightness(80%) contrast(30%);
  cursor: not-allowed;
  box-shadow: none;
`;

export const focused = css`
  outline: none;
`;

export const baseLineHeight = css`
  line-height: 1.5em;
`;

export const border = (color: string, width = '1px') => css`
  border: ${width} solid ${color};
`;

export const spacing = '0.25rem';
export const spacingN = (n: number): string => `calc(${spacing} * ${n})`;
export const bgColor = '#292929';
export const textColor = '#dddddd';
export const minorTextColor = darken(0.2, textColor);
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
export const lineColor = lighten(0.15, bgColor);
export const primaryColor = '#B18139';
export const dangerColor = '#9a4444';
export const inputBgColor = lighten(0.1, bgColor);
export const inputBorderColor = '#555555';
export const headerBgColor = '#333333';
export const linkColor = lighten(0.2, primaryColor);
export const headerHeight = spacingN(14);
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
export const focusOutlineColor = 'rgba(255, 255, 255, 0.4)';
export const chatSidebarColor = darken(0.03, headerBgColor);

export const mainWidth = css`
  max-width: 50em;
`;
export const uiShadowValue = `0 0 4px 0 ${transparentize(0.6, uiShadowColor)}, 0 1px 1px 0 ${uiShadowColor}`;
export const uiShadow = css`
  box-shadow: ${uiShadowValue};
`;

export const headerShadow = css`
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.5);
`;
export const shadowXl = css`
  box-shadow: 0 0 24px #000000;
`;
export const focusShadow = css`
  outline: none;
  box-shadow: 0 0 0 2px ${focusOutlineColor}, ${uiShadowValue};
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

export const preLine = css`
  white-space: pre-line;
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
    margin-left: ${spacingN(n)};
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

export const listItemSquare = css`
  list-style-type: square;
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
export const grid = css`
  display: grid;
`;

export const alignItemCenter = css`
  align-items: center;
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

export const mainP = [pX(6), pY(4)];

export const listStyleSquare = css`
  list-style-type: square;
`;

export const flex1 = css`
  flex: 1 1;
`;

export const widthFull = css`
  width: 100%;
`;

export const controlHeight = css`
  height: 2.5rem;
`;

export const largeInput = [widthFull, textXl, controlHeight];

export const gridColumn = (start: number, end: number) => css`
  grid-column: ${start} / ${end};
`;

export const spaceGrid = [
  grid,
  css`
    grid-template-columns: 1fr 1fr;
    gap: ${spacingN(2)};
  `,
  sm(
    css`
      grid-template-columns: 1fr 1fr 1fr;
    `
  ),
  md(
    css`
      grid-template-columns: 1fr 1fr 1fr 1fr;
    `
  ),
];

export const link = css`
  ${inlineBlock};
  color: ${linkColor};
  text-decoration: none;

  transition-property: all;
  transition-duration: 0.2s;
  transition-timing-function: ease-in;
  border-bottom: 1px solid ${linkColor};

  &:hover {
    color: ${lighten(0.1, linkColor)};
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus {
    ${[focusShadow, roundedPx]};
  }
`;

export const baseStyle = css`
  html {
    font-size: 14px;
    font-family: ${fontBase};
    background-color: ${bgColor};
    color: ${textColor};
    ${baseLineHeight};
  }
`;

export const flexCol = css`
  display: flex;
  flex-direction: column;
`;

export const chatRight = css`
  grid-column: header-start / header-end;
  grid-row: header-start / compose-end;
`;

export const flexGrow = css`
  flex-grow: 1;
`;

export const outlineButton = css`
  display: inline-block;
  color: ${textColor};
  ${textLg};
  background-color: rgba(255, 255, 255, 0.05);
  text-decoration: none;
  border: 0.075em solid rgba(255, 255, 255, 0.2);
  ${[roundedPx, pX(3), pY(2), uiShadow]};

  &:hover {
    border-color: ${lighten(0, primaryColor)};
  }
  &:active {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

export const headerTransition = css`
  transition: all 120ms ease-in-out;
`;

export const chatHeaderPadding = css`
  ${[pX(2), pY(1.5)]};
`;
export const sidebarWidth = css`
  min-width: 200px;
  max-width: 200px;
`;

export const chatHeaderStyle = css`
  background-color: ${headerBgColor};
  ${[chatHeaderPadding]};
  grid-area: header;
  z-index: 6;
  ${headerShadow};
  display: flex;
  align-items: stretch;
  justify-content: space-between;
`;
export const selectTheme = (theme: Theme): Theme => ({
  borderRadius: 1,
  spacing: theme.spacing,
  colors: {
    primary: primaryColor,
    primary75: darken(0.3, primaryColor),
    primary50: darken(0.25, primaryColor),
    primary25: darken(0.2, primaryColor),
    danger: dangerColor,
    dangerLight: darken(0.2, dangerColor),
    neutral0: bgColor,
    neutral5: mix(0.9, bgColor, textColor),
    neutral10: mix(0.8, bgColor, textColor),
    neutral20: mix(0.7, bgColor, textColor),
    neutral30: mix(0.6, bgColor, textColor),
    neutral40: mix(0.5, bgColor, textColor),
    neutral50: mix(0.4, bgColor, textColor),
    neutral60: mix(0.3, bgColor, textColor),
    neutral70: mix(0.2, bgColor, textColor),
    neutral80: mix(0.1, bgColor, textColor),
    neutral90: textColor,
  },
});
const colorA = 'rgba(48, 48, 48, 0.9)';
const colorB = 'rgba(52, 52, 52, 0.9)';
export const previewStyle = css`
  background: repeating-linear-gradient(45deg, ${colorA}, ${colorA} 10px, ${colorB} 10px, ${colorB} 20px);
`;
