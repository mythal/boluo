const { revertPalette: revert } = require('palette-tools');
const colors = require('tailwindcss/colors');
const plugin = require('tailwindcss/plugin');
const themeSwapper = require('tailwindcss-theme-swapper');

const { red, neutral, blue, green, yellow, white, black, gray, slate, lime } = colors;
const revRed = revert(red);
const revNetral = revert(neutral);
const revGreen = revert(green);
const revYellow = revert(yellow);
const revGray = revert(gray);
const revLime = revert(lime);
const revSlate = revert(slate);
const revBlue = revert(blue);

/** @type {import('tailwindcss').Config["theme"]} */
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
    gray,
    error: red,
    warning: yellow,
    surface: neutral,
    design: {
      sidebar: gray['100'],
      sortItem: green[200],
      sortItemBorder: green[700],
      popoverBox: gray['100'],
    },
    dialog: {
      border: gray[300],
      bg: gray[50],
      shadow: 'rgba(0, 0, 0, 0.25)',
    },
    toast: {
      default: gray[700],
      warn: yellow[600],
      error: red[700],
      border: black,
    },
    select: {
      button: {
        bg: white,
        text: black,
        border: gray[300],
        disabled: gray[100],
        disabledText: gray[500],
        hoverBorder: gray[500],
        hover: gray[50],
        openBorder: gray[500],
        open: gray[200],
      },
      list: {
        border: black,
        text: black,
      },
      item: {
        bg: gray[100],
        text: black,
        hover: gray[50],
        highlighted: gray[50],
        selectedHover: green[600],
        selected: green[700],
        selectedHighlighted: green[600],
      },
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
};

/** @type {import('tailwindcss').Config["theme"]} */
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
    highest: white,
    lowest: black,
    pin: {
      brand: blue,
    },
    bg: slate[900],
    text: neutral[50],
    brand: revBlue,
    gray: revert(gray),
    error: revRed,
    warning: revYellow,
    surface: revert(neutral),
    design: {
      sidebar: slate[800],
      sortItem: green[700],
      sortItemBorder: black,
      popoverBox: gray[900],
    },
    dialog: {
      border: gray[900],
      bg: slate[800],
      shadow: 'rgba(0, 0, 0, 0.03)',
    },
    toast: {
      default: gray[900],
      warn: yellow[700],
      error: red[800],
      border: white,
    },
    select: {
      button: {
        bg: gray[900],
        text: white,
        border: gray[600],
        disabled: black,
        disabledText: gray[500],
        hoverBorder: gray[500],
        hover: gray[800],
        openBorder: gray[500],
        open: black,
      },
      list: {
        border: gray[600],
        text: white,
      },
      item: {
        bg: black,
        text: white,
        hover: gray[600],
        highlighted: gray[600],
        selectedHover: blue[600],
        selected: blue[800],
        selectedHighlighted: blue[600],
      },
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

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,html}',
    './index.html',
    '../../packages/ui/*.{js,ts,jsx,tsx,html}',
    '../../packages/*/src/**/*.{js,ts,jsx,tsx,html}',
  ],
  darkMode: 'class',
  theme: {
    colors: {
      green: colors.green,
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
      boxShadow: {
        '1/2': '0.125rem 0.125rem 0',
        1: '0.25rem 0.25rem 0',
        key: '0px 1px 0px 1px',
        toast: '0.125rem 0.125rem 0 rgba(0, 0, 0, 0.25)',
        menu: '0.25rem 0.25rem 0 rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        pixel: ['Fusion-Pixel-12', 'monospace'],
      },
    },
  },
  plugins: [
    plugin(function({ addVariant }) {
      addVariant('enabled', '&:not(:disabled)');
      addVariant('hover-enabled', '&:hover:not(:disabled)');
      addVariant('active-enabled', '&:is([data-active="true"],:active):not(:disabled)');
      addVariant('on', '&[data-on="true"]');
      addVariant('off', '&[data-on="false"]');
      addVariant('state-on', '&[data-state="on"]');
      addVariant('state-off', '&[data-state="off"]');
      addVariant('state-open', '&[data-state="open"]');
      addVariant('state-closed', '&[data-state="closed"]');
      addVariant('state-checked', '&[data-state="checked"]');
      addVariant('state-unchecked', '&[data-state="unchecked"]');
      addVariant('hightlighted', '&[data-highlighted]');
    }),

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
