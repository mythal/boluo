import { darken, lighten, mix } from 'polished';

// https://tailwindcss.com/docs/customizing-colors

export const black = '#000000';

export const white = '#FFFFFF';

export const gray = {
  '100': '#F7FAFC',
  '200': '#EDF2F7',
  '300': '#E2E8F0',
  '400': '#CBD5E0',
  '500': '#A0AEC0',
  '600': '#718096',
  '700': '#4A5568',
  '800': '#2D3748',
  '900': '#1A202C',
};
export const red = {
  '100': '#fff5f5',
  '200': '#FED7D7',
  '300': '#FEB2B2',
  '400': '#FC8181',
  '500': '#F56565',
  '600': '#E53E3E',
  '700': '#C53030',
  '800': '#9B2C2C',
  '900': '#742A2A',
};
export const blue = {
  '100': '#EBF8FF',
  '200': '#BEE3F8',
  '300': '#90CDF4',
  '400': '#63B3ED',
  '500': '#4299E1',
  '600': '#3182CE',
  '700': '#2B6CB0',
  '800': '#2C5282',
  '900': '#2A4365',
};
export const primary = {
  '100': '#FFFAF0',
  '200': '#FEEBC8',
  '300': '#FBD38D',
  '400': '#F6AD55',
  '500': '#ED8936',
  '600': '#DD6B20',
  '700': '#C05621',
  '800': '#9C4221',
  '900': '#7B341E',
};

export const green = {
  '100': '#F0FFF4',
  '200': '#C6F6D5',
  '300': '#9AE6B4',
  '400': '#68D391',
  '500': '#48BB78',
  '600': '#38A169',
  '700': '#2F855A',
  '800': '#276749',
  '900': '#22543D',
};

export const purple = {
  '100': '#FAF5FF',
  '200': '#E9D8FD',
  '300': '#D6BCFA',
  '400': '#B794F4',
  '500': '#9F7AEA',
  '600': '#805AD5',
  '700': '#6B46C1',
  '800': '#553C9A',
  '900': '#44337A',
};

export const transparent = {
  '100': 'rgba(255, 255, 255, 0.9)',
  '200': 'rgba(255, 255, 255, 0.8)',
  '300': 'rgba(255, 255, 255, 0.7)',
  '400': 'rgba(255, 255, 255, 0.6)',
  '500': 'rgba(255, 255, 255, 0.5)',
  '600': 'rgba(255, 255, 255, 0.4)',
  '700': 'rgba(255, 255, 255, 0.3)',
  '800': 'rgba(255, 255, 255, 0.2)',
  '900': 'rgba(255, 255, 255, 0.1)',
};

export const bgColor = gray['900'];
export const textColor = gray['100'];
export const minorTextColor = darken(0.2, textColor);
export const uiShadowColor = '#000000';
export const errorColor = '#711518';
export const lineColor = lighten(0.15, bgColor);
export const primaryColor = primary['500'];
export const dangerColor = '#9a4444';
export const linkColor = lighten(0.2, primaryColor);
export const closeButtonHoverColor = 'rgba(255,255,255,0.2)';
export const closeButtonActiveColor = 'rgba(255,255,255,0.4)';
export const modalMaskColor = 'rgba(0,0,0,0.5)';

export const dialogBgColor = mix(0.5, gray['800'], gray['900']);
export const dialogTitleColor = gray['500'];
export const dialogShadowColor = 'rgba(100, 100, 100, 0.4)';

export const buttonColor = gray['700'];
export const buttonPrimaryColor = primary['600'];
export const buttonDangerColor = red['600'];
export const buttonDarkColor = gray['800'];

export const informationInfoColor = blue['700'];
export const informationWarnColor = '#B7791F';
export const informationErrorColor = red['800'];
export const informationSuccessColor = green['700'];

export const headerBgColor = gray['800'];

export const focusOutlineColor = 'rgba(255,255,255,0.4)';
export const chatSidebarColor = darken(0.03, headerBgColor);

export const inputBgColor = gray['800'];

export const menuBgColor = '#000000';
export const menuShadowColor = 'rgba(100, 100, 100, 0.2)';
export const menuItemHoverColor = primary['700'];

export const sidebarItemColor = darken(0.1, textColor);
export const sidebarItemHoverBgColor = 'rgba(0, 0, 0, 0.1)';
export const sidebarItemActiveBgColor = 'rgba(0, 0, 0, 0.2)';
