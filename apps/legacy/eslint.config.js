import { createConfig } from '@boluo/eslint-config/react-internal';

export default [
  ...createConfig(import.meta.dirname),
  {
    files: ['vite.config.ts'],
    rules: {
      // Allow process usage in build config
      'no-restricted-globals': 'off',
    },
  },
  {
    rules: {
      '@eslint-react/dom-no-unknown-property': ['error', { ignore: ['css'] }],
      '@eslint-react/no-missing-component-display-name': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/error-boundaries': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];
