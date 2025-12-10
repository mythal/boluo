import { config } from '@boluo/eslint-config/react-internal';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: ['vite.config.ts'],
    rules: {
      // Allow process usage in build config
      'no-restricted-globals': 'off',
    },
  },
  {
    rules: {
      'react/no-unknown-property': ['error', { ignore: ['css'] }],
      'react/prop-types': 'off',
      'react/display-name': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/error-boundaries': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];
