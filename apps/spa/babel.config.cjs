module.exports = {
  plugins: [
    [
      'formatjs',
      {
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
        ast: true,
      },
    ],
    ['jotai/babel/plugin-react-refresh'],
  ],
};
