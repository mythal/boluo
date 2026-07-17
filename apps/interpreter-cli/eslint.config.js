import { createConfig } from '@boluo/eslint-config/base';

export default [
  ...createConfig(import.meta.dirname),
  {
    rules: {
      'no-restricted-globals': 'off',
    },
  },
];
