import themeSwapper from 'tailwindcss-theme-swapper';
import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';
import { revertPalette as revert, palette } from 'utils';
import screens from './screens.json';
import type { Config } from 'tailwindcss';
const red = palette(colors.red);
const neutral = palette(colors.neutral);
const blue = palette(colors.blue);
const green = palette(colors.green);
const yellow = palette(colors.yellow);
const white: string = colors.white;
const black: string = colors.black;
const gray = palette(colors.gray);
const slate = palette(colors.slate);
const lime = palette(colors.lime);

const revRed = revert(red);
const revNetral = revert(neutral);
const revGreen = revert(green);
const revYellow = revert(yellow);
const revGray = revert(gray);
const revLime = revert(lime);
const revSlate = revert(slate);
const revBlue = revert(blue);

const lightTheme = {
  ringColor: {
    DEFAULT: green[400],
  },
  ringOffsetColor: {
    DEFAULT: neutral[50],
  },
  borderColor: {
    DEFAULT: neutral[200],
  },
  colors: {
    pin: {
      highest: black,
      lowest: white,
      surface: neutral,
      brand: lime,
      gray: gray,
    },
    highest: black,
    lowest: white,
    bg: neutral[50],
    text: black,
    brand: lime,
    green,
    gray,
    error: red,
    warning: yellow,
    surface: neutral,
    input: {
      default: {
        border: gray[300],
        bg: white,
        placeholder: gray[400],
        focusBorder: gray[600],
        hoverBorder: gray[600],
      },
      error: {
        border: red[500],
        bg: red[100],
        ring: red[100],
        placeholder: red[600],
        focusBorder: red[400],
        hoverBorder: red[400],
      },
      warning: {
        border: yellow[500],
        bg: yellow[100],
        ring: yellow[50],
        placeholder: yellow[600],
        focusBorder: yellow[300],
        hoverBorder: yellow[300],
      },
    },
  },
};

const darkTheme = {
  ringColor: {
    DEFAULT: blue[500],
  },
  ringOffsetColor: {
    DEFAULT: slate[900],
  },
  borderColor: {
    DEFAULT: neutral[700],
  },
  colors: {
    pin: {
      brand: blue,
    },
    highest: white,
    lowest: black,
    bg: slate[700],
    text: neutral[50],
    brand: revBlue,
    gray: revert(gray),
    error: revRed,
    warning: revYellow,
    surface: revert(neutral),
    green: revGreen,
    input: {
      default: {
        border: gray[600],
        bg: gray[900],
        placeholder: gray[700],
        focusBorder: gray[400],
        hoverBorder: gray[400],
      },
      error: {
        border: red[500],
        bg: red[900],
        ring: red[800],
        placeholder: red[600],
        focusBorder: red[600],
        hoverBorder: red[600],
      },
      warning: {
        border: yellow[500],
        bg: yellow[100],
        ring: yellow[50],
        placeholder: yellow[600],
        focusBorder: yellow[300],
        hoverBorder: yellow[300],
      },
    },
  },
};

const config: Config = {
  content: [],
  darkMode: 'class',
  theme: {
    screens: Object.fromEntries(Object.entries(screens).map(([key, value]) => [key, `${value}px`])),
    colors: {
      blue: colors.blue,
      neutral: colors.neutral,
      slate: colors.slate,
      black: '#000',
      white: '#FFF',
      tooltip: colors.yellow[100],
      transprent: 'transparent',
    },
    borderWidth: {
      DEFAULT: '1px',
      '1/2': '0.125rem',
      1: '0.25rem',
    },
    extend: {
      ringOffsetWidth: {
        DEFAULT: '1px',
      },
      fontSize: {
        '12px': '12px',
        '24px': '24px',
      },
      width: {
        sidebar: '12rem',
      },
      height: {
        'pane-header': '3rem',
      },
      minHeight: {
        'pane-header': '3rem',
      },
      boxShadow: {
        '1/2': '0.125rem 0.125rem 0',
        1: '0.25rem 0.25rem 0',
      },
      fontFamily: {
        pixel: ['Fusion-Pixel-12', 'monospace'],
      },
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant('enabled', '&:not(:disabled)');
      addVariant('hover-enabled', '&:hover:not(:disabled)');
      addVariant('active-enabled', '&:is([data-active="true"],:active):not(:disabled)');
      addVariant('on', '&[data-on="true"]');
      addVariant('off', '&[data-on="false"]');
    }),
    require('@tailwindcss/container-queries'),
    themeSwapper({
      themes: [
        {
          name: 'base',
          selectors: [':root'],
          theme: lightTheme,
        },
        {
          name: 'dark',
          selectors: ['.dark'],
          theme: darkTheme,
        },
      ],
    }),
  ],
};

export default config;
