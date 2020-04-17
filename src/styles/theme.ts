import { lighten } from 'polished';
import { css } from '@emotion/core';

export const spacing = '0.25em';
export const spacingN = (n: number) => `calc(${spacing} * ${n})`;
export const bgColor = '#292929';
export const textColor = '#dddddd';

export const inputBgColor = lighten(0.1, bgColor);

export const textXs = '.75rem';
export const textSm = '.875rem';
export const textLg = '1.125rem';
export const textXl = '1.25rem';
export const text2Xl = '1.5rem';
export const text3Xl = '1.875rem';

export const fontSans = 'system-ui, -apple-system, sans-serif';
export const fontBase = fontSans;
export const controlRounded = css`
  border-radius: 1px;
`;
