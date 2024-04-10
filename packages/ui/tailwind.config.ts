import './types.d';
import themeSwapper from 'tailwindcss-theme-swapper';
import { mix, rgba } from 'color2k';
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

const makeTheme = (name: 'dark' | 'light'): Config['theme'] => {
  const $ = <T, U>(inLight: T, inDark: U): T | U => (name === 'light' ? inLight : inDark);
  const darkPaneBg = mix(zinc[800], zinc[700], 0.25);
  const brand = $(lime, blue);
  return {
    ringColor: {
      DEFAULT: $(green[400], blue[500]),
    },
    ringOffsetColor: {
      DEFAULT: $(neutral[50], slate[900]),
    },
    borderColor: {
      DEFAULT: $(neutral[200], neutral[700]),
    },
    colors: {
      brand,
      green: $(green, revert(green)),
      gray: $(gray, revert(gray)),
      error: $(red, revert(red)),
      warning: $(yellow, revert(yellow)),
      surface: $(neutral, revert(neutral)),
      pin: {
        highest: black,
        lowest: white,
        surface: neutral,
        brand: lime,
        gray,
      },
      light: {
        bg: neutral[100],
      },
      dark: {
        bg: darkPaneBg,
      },
      highest: $(black, white),
      lowest: $(white, black),
      link: {
        normal: $(blue[700], blue[400]),
        hover: $(blue[600], blue[300]),
        active: $(blue[500], blue[200]),
      },
      bg: $(neutral[50], neutral[800]),
      pane: {
        bg: $(neutral[100], darkPaneBg),
        header: {
          bg: $(neutral[100], neutral[800]),
          border: $(neutral[200], neutral[700]),
        },
      },
      sidebar: {
        divider: $(neutral[200], mix(neutral[700], neutral[800], 0.5)),
      },
      connect: {
        success: $(green[300], green[700]),
      },
      select: {
        bg: $(neutral[50], neutral[700]),
      },
      text: {
        base: $(neutral[900], white),
        light: $(neutral[600], neutral[400]),
        lighter: $(neutral[500], neutral[500]),
        danger: $(red[600], red[300]),
        wanring: $(yellow[600], yellow[300]),
      },
      preview: {
        self: $(neutral[200], mix(neutral[700], blue[500], 0.4)),
        hint: $(rgba(0, 0, 0, 0.125), rgba(255, 255, 255, 0.125)),
        toolbar: {
          hover: $(neutral[100], neutral[900]),
          active: {
            border: $(neutral[600], neutral[400]),
            bg: $(lime[100], blue[900]),
            bgHover: $(lime[50], blue[800]),
          },
        },
      },
      message: {
        inGame: {
          bg: $(mix(neutral[100], lime[100], 0.25), mix(neutral[900], blue[400], 0.25)),
        },
        action: $(neutral[400], neutral[600]),
        toolbox: {
          active: {
            bg: $(lime[600], blue[400]),
          },
          danger: $(red[600], red[500]),
        },
      },
      expr: {
        bg: $(lime[50], neutral[900]),
      },
      input: {
        normal: {
          bg: $(white, black),
          ring: $(gray[700], gray[300]),
          placeholder: $(gray[400], gray[700]),
          border: {
            default: $(gray[400], gray[600]),
            focus: $(lime[900], gray[400]),
            hover: $(gray[600], gray[400]),
          },
        },
        error: {
          bg: $(red[100], red[900]),
          ring: $(red[100], red[800]),
          placeholder: $(red[500], red[600]),
          border: {
            default: $(red[300], red[500]),
            focus: $(red[500], red[600]),
            hover: $(red[500], red[600]),
          },
        },
        warning: {
          bg: $(yellow[50], yellow[100]),
          ring: $(yellow[100], yellow[50]),
          placeholder: $(yellow[400], yellow[600]),
          border: {
            default: $(yellow[300], yellow[500]),
            focus: $(yellow[600], yellow[300]),
            hover: $(yellow[600], yellow[300]),
          },
        },
      },
    },
  };
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
        pane: '1.75rem',
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
          theme: makeTheme('light'),
        },
        {
          name: 'dark',
          selectors: ['.dark'],
          theme: makeTheme('dark'),
        },
      ],
    }),
  ],
};

export default config;
