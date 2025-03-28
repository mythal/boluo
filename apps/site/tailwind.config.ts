import type { Config } from 'tailwindcss';
// Use relative path to work with hot reload
import defaultConfig from '../../packages/ui/tailwind.config';

const config: Config = {
  ...defaultConfig,
  content: [
    '!../../**/node_modules/**',
    '../../packages/**/*.{tsx,ts,html}',
    '../../apps/**/*.{tsx,ts,html}',
  ],
};

export default config;
