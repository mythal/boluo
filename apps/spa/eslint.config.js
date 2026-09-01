import { createConfig } from '@boluo/eslint-config/next-js';

export default [
  ...createConfig(import.meta.dirname),
  {
    files: ['worker.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.worker.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
