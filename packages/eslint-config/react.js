import eslintReact from '@eslint-react/eslint-plugin';
import pluginReactHooks from 'eslint-plugin-react-hooks';

/**
 * React pieces shared by the react-internal and Next.js configurations.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const reactConfig = [
  eslintReact.configs['recommended-typescript'],
  {
    rules: {
      // Naming conventions
      '@eslint-react/use-state': 'off',
      '@eslint-react/naming-convention-context-name': 'off',
      '@eslint-react/naming-convention-ref-name': 'off',
    },
  },
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
  // eslint-react owns the rules it shares with eslint-plugin-react-hooks.
  eslintReact.configs['disable-conflict-eslint-plugin-react-hooks'],
];
