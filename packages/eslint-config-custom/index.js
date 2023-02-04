// Fix `Parsing error: Cannot find module 'next/babel'`
//
// https://github.com/vercel/next.js/issues/40687#issuecomment-1264177674

/**
* @type {import('eslint').Linter.Config}
*/
module.exports = {
  extends: ["next", "turbo", "prettier"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/jsx-key": "off",
  },
  parserOptions: {
    babelOptions: {
      presets: [require.resolve('next/babel')],
    },
  },
};
