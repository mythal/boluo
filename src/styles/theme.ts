import { darken, lighten } from 'polished';
import { roundedPx } from './atoms';

export const spacing = '0.25em';
export const spacingN = (n: number): string => `calc(${spacing} * ${n})`;
export const bgColor = '#292929';
export const textColor = '#dddddd';
export const darkTextColor = '#242424';

export const textXs = '.75rem';
export const textSm = '.875rem';
export const textLg = '1.125rem';
export const textXl = '1.25rem';
export const text2Xl = '1.5rem';
export const text3Xl = '1.875rem';

export const fontSans = 'system-ui, -apple-system, sans-serif';
export const fontBase = fontSans;
export const controlRounded = roundedPx;

export const infoColor = '#45675e';
export const warnColor = '#307830';
export const errorColor = '#711518';
export const normalColor = '#555555';
export const lineColor = lighten(0.35, normalColor);
export const primaryColor = '#7c842d';
export const dangerColor = '#9c4f4f';

export const inputBgColor = lighten(0.1, bgColor);
export const inputBorderColor = '#555555';

export const headerHeight = spacingN(16);
export const sidebarMinWidth = spacingN(48);
export const sidebarMaxWidth = '20%';

export const menuBgColor = '#000000';
export const menuShadowColor = 'rgba(0,0,0,0.56)';
export const menuItemHoverColor = darken(0.1, primaryColor);
