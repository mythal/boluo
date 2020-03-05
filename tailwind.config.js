const all = ['responsive', 'hover', 'focus', 'active', 'disabled', 'group-hover'];

module.exports = {
  theme: {
    extend: {
      transitionDuration: {
        '0': '0ms',
        '1000': '1000ms',
        '2000': '2000ms',
        '3000': '3000ms',
        '4000': '4000ms',
        '5000': '5000ms',
        '6000': '6000ms',
        '7000': '7000ms',
        '8000': '8000ms',
        '9000': '9000ms',
        '10000': '10000ms',
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
