const { colors } = require('tailwindcss/defaultTheme');

const all = ['responsive', 'hover', 'focus', 'active', 'disabled', 'group-hover'];

module.exports = {
  theme: {
    extend: {
      colors: {
        primary: colors.green,
      },
      boxShadow: {
        ui: '0 1px 2px 0 rgba(0, 0, 0, 0.2), 0 1px 2px 0 rgba(0, 0, 0, 0.1)',
      },
    },
  },
  variants: {
    backgroundColor: all,
    textColor: all,
    borderColor: all,
    opacity: all,
    display: all,
    width: all,
    height: all,
  },
  plugins: [],
};
