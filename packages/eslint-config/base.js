import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';
import onlyWarn from 'eslint-plugin-only-warn';

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map((typedConfig) => ({
  ...typedConfig,
  files: tsFiles,
  languageOptions: {
    ...typedConfig.languageOptions,
    parserOptions: {
      ...typedConfig.languageOptions?.parserOptions,
      projectService: true,
      tsconfigRootDir: process.cwd(),
    },
  },
  rules: {
    ...typedConfig.rules,

    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false,
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/only-throw-error': 'off',
  },
}));

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...typeCheckedConfigs,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ['dist/**', 'out/**', '.next/**', 'postcss.config.cjs'],
  },
  {
    rules: {
      'no-restricted-globals': ['warn', 'process'],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];
