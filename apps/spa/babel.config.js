module.exports = {
  presets: [
    [
      'next/babel',
      {
        'preset-env': {
          // https://browserslist.dev/
          targets: '>0.25%, not dead, not OperaMini all, not UCAndroid > 0',
        },
      },
    ],
    'jotai/babel/preset',
  ],
  plugins: [
    [
      'formatjs',
      {
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
        ast: true,
      },
    ],
  ],
};
