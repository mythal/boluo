import './types.d';
import themeSwapper from 'tailwindcss-theme-swapper';
import { mix, rgba, transparentize } from 'color2k';
import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';
import { revertPalette as revert, palette } from '@boluo/utils';
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
const zinc = palette(colors.zinc);
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
    link: {
      normal: blue[700],
      hover: blue[600],
      active: blue[500],
    },
    bg: neutral[50],
    pane: {
      bg: neutral[100],
      header: neutral[100],
    },
    sidebar: {
      divider: neutral[200],
    },
    connect: {
      success: green[300],
    },
    select: {
      bg: neutral[50],
    },
    text: {
      base: neutral[900],
      light: neutral[600],
      danger: red[600],
      wanring: yellow[600],
    },
    brand: lime,
    green,
    gray,
    error: red,
    warning: yellow,
    surface: neutral,
    preview: {
      self: neutral[200],
      toolbar: neutral[100],
      hint: rgba(0, 0, 0, 0.2),
    },
    message: {
      inGame: {
        bg: mix(neutral[100], lime[100], 0.25),
      },
    },
    expr: {
      bg: lime[50],
    },
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
} satisfies Config['theme'];

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
    link: {
      normal: blue[400],
      hover: blue[300],
      active: blue[200],
    },
    bg: neutral[800],
    pane: {
      bg: mix(zinc[800], zinc[700], 0.25),
      header: neutral[800],
    },
    sidebar: {
      divider: mix(neutral[700], neutral[800], 0.5),
    },
    connect: {
      success: green[700],
    },
    select: {
      bg: neutral[700],
    },
    text: {
      base: white,
      light: neutral[400],
      danger: red[300],
      warning: yellow[300],
    },
    brand: revBlue,
    gray: revert(gray),
    error: revRed,
    warning: revYellow,
    surface: revert(neutral),
    green: revGreen,
    preview: {
      self: blue[900],
      toolbar: neutral[900],
      hint: rgba(255, 255, 255, 0.25),
    },
    message: {
      inGame: {
        bg: mix(neutral[900], blue[400], 0.25),
      },
    },
    expr: {
      bg: neutral[900],
    },
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
      padding: {
        messageRight: '4rem',
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
