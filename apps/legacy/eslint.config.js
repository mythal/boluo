import { config } from '@boluo/eslint-config/react-internal';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    rules: {
      'react/no-unknown-property': ['error', { ignore: ['css'] }],
      'react/prop-types': 'off',
      'react/display-name': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['vite.config.ts'],
    rules: {
      // Allow process usage in build config
      'no-restricted-globals': 'off',
    },
  },
];
