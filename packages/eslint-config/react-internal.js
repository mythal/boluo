import globals from 'globals';
import { createConfig as createBaseConfig } from './base.js';
import { reactConfig } from './react.js';

/**
 * Create the ESLint configuration for libraries that use React.
 *
 * @param {string} tsconfigRootDir The package directory, i.e. `import.meta.dirname`
 *   of the package's `eslint.config.js`.
 * @returns {import("eslint").Linter.Config[]}
 */
export function createConfig(tsconfigRootDir) {
  return [
    ...createBaseConfig(tsconfigRootDir),
    ...reactConfig,
    {
      languageOptions: {
        globals: {
          ...globals.serviceworker,
          ...globals.browser,
        },
      },
    },
    {
      rules: {
        // Keep the react-hooks rules eslint-react's recommended set doesn't cover.
        'react-hooks/refs': 'error',
        'react-hooks/globals': 'error',
        'react-hooks/immutability': 'error',
      },
    },
  ];
}
