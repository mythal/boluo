import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import pluginNext from '@next/eslint-plugin-next';
import { createConfig as createBaseConfig } from './base.js';
import { reactConfig } from './react.js';

/**
 * Create the ESLint configuration for Next.js applications.
 *
 * @param {string} tsconfigRootDir The package directory, i.e. `import.meta.dirname`
 *   of the package's `eslint.config.js`.
 * @returns {import("eslint").Linter.Config[]}
 */
export function createConfig(tsconfigRootDir) {
  return [
    ...createBaseConfig(tsconfigRootDir),
    globalIgnores([
      // Default ignores of eslint-config-next:
      '**/.next/**',
      '**/_next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ]),
    ...reactConfig,
    {
      languageOptions: {
        globals: {
          ...globals.serviceworker,
        },
      },
    },
    {
      plugins: {
        '@next/next': pluginNext,
      },
      rules: {
        ...pluginNext.configs.recommended.rules,
        ...pluginNext.configs['core-web-vitals'].rules,
      },
    },
    {
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',

        // Keep the react-hooks rules eslint-react's recommended set doesn't cover.
        'react-hooks/refs': 'error',
        'react-hooks/globals': 'error',
        'react-hooks/immutability': 'error',
      },
    },
  ];
}
