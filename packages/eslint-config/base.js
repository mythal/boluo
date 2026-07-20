import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];

/**
 * Create the shared ESLint configuration for the repository.
 *
 * @param {string} tsconfigRootDir The package directory, i.e. `import.meta.dirname`
 *   of the package's `eslint.config.js`.
 * @returns {import("eslint").Linter.Config[]}
 */
export function createConfig(tsconfigRootDir) {
  return [
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked.map((typedConfig) => ({
      ...typedConfig,
      files: tsFiles,
    })),
    {
      files: tsFiles,
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
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
    },
    {
      plugins: {
        turbo: turboPlugin,
      },
      rules: {
        'turbo/no-undeclared-env-vars': 'warn',
      },
    },
    {
      ignores: ['**/dist/**', 'out/**', '**/.next/**', '**/_next/**', 'postcss.config.cjs'],
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
    // Keep last to disable rules that conflict with Prettier.
    eslintConfigPrettier,
  ];
}
