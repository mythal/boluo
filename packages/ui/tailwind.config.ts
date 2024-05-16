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

const makeTheme = (name: 'dark' | 'light'): Config['theme'] => {
  const $ = <T, U>(inLight: T, inDark: U): T | U => (name === 'light' ? inLight : inDark);
  const darkPaneBg = mix(zinc[800], zinc[700], 0.25);
  const inGameMessageBg = $('#fbfdf6', zinc[700]);
  console.log('inGameMessageBg', inGameMessageBg);
  const brand = $(lime, revert(blue));
  const themeColor = {
    light: neutral[50],
    dark: neutral[900],
  };
  const text = {
    base: $(neutral[900], white),
    reverse: $(white, neutral[900]),
    light: $(neutral[600], neutral[300]),
    lighter: $(neutral[500], neutral[400]),
    danger: $(red[600], red[300]),
    wanring: $(yellow[600], yellow[300]),
  };
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
      theme: {
        light: themeColor.light,
        dark: themeColor.dark,
        system: $(themeColor.light, themeColor.dark),
      },
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
      dot: {
        normal: blue[600],
      },
      tooltip: {
        bg: black,
        text: white,
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
      floating: {
        bg: $(neutral[50], neutral[900]),
      },
      card: {
        bg: $(white, neutral[900]),
        border: $(neutral[200], neutral[800]),
        shadow: $(neutral[100], neutral[900]),
      },
      pane: {
        bg: $(white, darkPaneBg),
        header: {
          bg: $(white, neutral[800]),
          border: $(neutral[100], transparentize(neutral[900], 0.5)),
          shadow: $(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2)),
        },
        divide: $(neutral[50], neutral[950]),
        tab: {
          bg: $(neutral[100], neutral[950]),
          text: $(neutral[500], neutral[400]),
          active: {
            text: $(black, white),
          },
        },
      },
      sidebar: {
        divider: $(neutral[100], mix(neutral[800], neutral[900], 0.3)),
        border: $(neutral[200], neutral[700]),
        channels: {
          hover: $(neutral[100], neutral[950]),
          placeholder: {
            random1: $(neutral[100], neutral[800]),
            random2: $(neutral[200], neutral[700]),
            random3: $(neutral[300], neutral[600]),
          },
          reorderButton: {
            text: text.lighter,
            hover: {
              text: text.base,
              bg: $(neutral[200], neutral[700]),
            },
            active: {
              bg: $(neutral[600], neutral[400]),
              text: $(white, black),
            },
          },

          active: {
            bg: $(neutral[100], neutral[900]),
            hover: $(neutral[200], neutral[950]),
          },

          button: {
            text: $(neutral[300], neutral[600]),
            active: {
              text: $(neutral[400], neutral[500]),
            },
            groupHover: {
              text: $(brand[600], brand[400]),
              bg: $(white, neutral[900]),
            },
            hover: {},
          },
        },
        toggler: {
          hover: $(blue[100], blue[900]),
          button: {
            bg: $(neutral[50], neutral[800]),
          },
          touch: $(transparentize(blue[100], 0.5), blue[800]),
          active: $(blue[500], blue[500]),
        },
        folder: {
          bg: $(neutral[50], neutral[900]),
          hover: {
            bg: $(neutral[100], neutral[800]),
          },
          active: {
            bg: $(neutral[200], neutral[700]),
          },
        },
      },
      connect: {
        success: $(green[300], green[700]),
      },
      select: {
        bg: $(neutral[50], neutral[700]),
      },
      text,
      failed: {
        icon: $(yellow[600], yellow[500]),
        banner: {
          bg: $(yellow[100], yellow[950]),
          border: $(yellow[200], yellow[900]),
        },
      },

      name: {
        bg: $(transparentize(neutral[200], 0.65), transparentize(neutral[600], 0.65)),
        editable: {
          hover: $(transparentize(neutral[300], 0.5), transparentize(neutral[500], 0.5)),
        },
        history: {
          bg: $(neutral[50], neutral[900]),
          hover: {
            bg: $(neutral[100], neutral[800]),
          },
        },
      },
      preview: {
        self: $(neutral[100], mix(neutral[700], blue[500], 0.4)),
        hint: $(rgba(0, 0, 0, 0.125), rgba(255, 255, 255, 0.125)),
        out: {
          bg: $(neutral[50], zinc[800]),
        },
        in: {
          bg: inGameMessageBg,
        },
        toolbar: {
          bg: $(neutral[50], neutral[900]),
          hover: $(neutral[100], neutral[900]),
          active: {
            border: $(neutral[600], neutral[400]),
            bg: $(lime[100], blue[900]),
            bgHover: $(lime[50], blue[800]),
          },
        },
      },
      bottom: {
        badge: {
          bg: brand[600],
          text: white,
        },
      },
      message: {
        hover: {
          bg: $(transparentize(neutral[50], 0.25), neutral[800]),
        },
        time: {
          text: $(neutral[300], neutral[600]),
        },
        handle: {
          text: $(neutral[500], neutral[500]),
          hover: {
            text: $(neutral[700], neutral[400]),
          },
        },
        inGame: {
          bg: inGameMessageBg,
          hover: {
            bg: $('#f8fceb', mix(zinc[600], zinc[700], 0.5)),
          },
        },
        action: $(neutral[400], neutral[600]),
        toolbox: {
          bg: $(neutral[50], neutral[900]),
          active: {
            bg: $(lime[600], blue[400]),
          },
          danger: $(red[600], red[500]),
        },
      },
      expr: {
        bg: $(lime[50], neutral[900]),
      },
      code: {
        bg: $(neutral[100], black),
        border: $(neutral[300], neutral[700]),
        text: $(black, yellow[300]),
      },
      compose: {
        border: $(neutral[200], black),
        focused: {
          border: $(neutral[400], neutral[600]),
        },
        media: {
          bg: $(neutral[100], neutral[700]),
          remove: {
            text: $(red[600], red[400]),
            hover: $(red[500], red[500]),
          },
          invalid: $(red[600], red[400]),
        },
        outer: {
          bg: $(neutral[50], neutral[800]),
        },
        bg: $(white, black),
        button: {
          bg: $(neutral[100], neutral[800]),
          hover: {
            bg: $(neutral[200], neutral[700]),
          },
        },
        highlight: {
          modifiers: {
            text: text.lighter,
          },
          strong: {
            bg: $(neutral[100], neutral[800]),
          },
          link: {
            underline: $(blue[300], blue[600]),
          },
          code: {
            bg: $(neutral[100], neutral[700]),
          },
          expr: {
            bg: $(blue[100], blue[900]),
          },
        },
      },
      selectBox: {
        bg: $(neutral[50], neutral[900]),
        hover: {
          bg: $(neutral[100], neutral[800]),
        },
        active: {
          bg: $(lime[50], blue[900]),
        },
      },
      switch: {
        bg: $(white, neutral[600]),
        indicator: $(neutral[400], neutral[800]),
        hover: {
          bg: $(neutral[100], neutral[700]),
        },
        pressed: {
          bg: $(neutral[200], neutral[900]),
          text: $(black, white),
          indicator: $(green[500], green[500]),
        },
      },
      button: {
        light: {
          hover: {
            bg: transparentize($(neutral[200], neutral[700]), 0.75),
          },
          active: {
            bg: $(neutral[200], neutral[700]),
          },
        },
        default: {
          bg: $(neutral[100], neutral[700]),
          text: $(black, white),
          hover: {
            bg: $(neutral[200], neutral[700]),
          },
          active: {
            bg: $(neutral[300], neutral[600]),
          },
          disabled: {
            bg: $(neutral[400], neutral[500]),
            text: $(neutral[600], neutral[400]),
          },
        },
        danger: {
          bg: $(red[600], red[500]),
          text: $(white, black),
          hover: {
            bg: $(red[500], red[400]),
          },
          active: {
            bg: $(red[400], red[300]),
          },
        },
        primary: {
          bg: brand[600],
          text: white,
          hover: {
            bg: brand[700],
          },
          active: {
            bg: brand[700],
          },
          disabled: {
            bg: brand[700],
            text: neutral[300],
          },
        },
        switch: {
          bg: $(neutral[100], neutral[700]),
          text: $(black, white),
          on: {
            hint: brand[400],
            bg: $(neutral[300], neutral[600]),
          },
          off: {
            hint: $(neutral[400], neutral[500]),
          },
          hover: {
            bg: $(neutral[200], neutral[700]),
          },
          active: {
            bg: $(neutral[300], neutral[600]),
          },
          disabled: {
            bg: $(neutral[400], neutral[600]),
            text: $(neutral[600], neutral[400]),
          },
          detail: {
            icon: $(neutral[600], neutral[400]),
          },
        },
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

const panePadding = '2rem';
const paneHeight = '2.25rem';
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
        sidebar: '16rem',
        panePadding,
      },
      height: {
        'pane-header': paneHeight,
      },
      padding: {
        messageRight: '4rem',
        pane: panePadding,
      },
      minHeight: {
        'pane-header': paneHeight,
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
