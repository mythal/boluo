import { createRequire } from 'node:module';
import type { StorybookConfig } from '@storybook/react-vite';

import { join, dirname } from 'path';

const require = createRequire(import.meta.url);

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')));
}
const config: StorybookConfig = {
  staticDirs: ['../public'],
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [getAbsolutePath('@storybook/addon-docs'), getAbsolutePath('@storybook/addon-themes')],
  framework: { name: getAbsolutePath('@storybook/react-vite'), options: {} },
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
};
export default config;
