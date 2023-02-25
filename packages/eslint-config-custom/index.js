// Fix `Parsing error: Cannot find module 'next/babel'`
//
// https://github.com/vercel/next.js/issues/40687#issuecomment-1264177674

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: ['next', 'prettier'],
  plugins: ['formatjs', 'import'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    '@next/next/no-html-link-for-pages': 'off',
    'react/jsx-key': 'off',
    'formatjs/no-offset': 'error',
    'formatjs/no-emoji': 'error',
    'formatjs/enforce-default-message': ['error', 'literal'],
  },
  parserOptions: {
    ecmaVersion: 'latest',
    babelOptions: {
      presets: [require.resolve('next/babel')],
    },
  },

  overrides: [
    {
      files: ['*.ts', '*.tsx'],

      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        // https://typescript-eslint.io/docs/linting/type-linting
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import/typescript',
      ],

      parser: '@typescript-eslint/parser',
      rules: {
        // https://typescript-eslint.io/rules/
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-misused-promises': 'warn',
        '@typescript-eslint/prefer-regexp-exec': 'warn',
        '@typescript-eslint/prefer-includes': 'warn',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
      },
    },
  ],
};
