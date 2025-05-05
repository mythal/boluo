import type { Config } from 'tailwindcss';
import defaultConfig from '@boluo/ui/tailwind.config';

const config: Config = {
  ...defaultConfig,
  content: [
    '!../../**/node_modules/**',
    '../../packages/**/*.{tsx,ts,html}',
    '../../apps/**/*.{tsx,ts,html}',
  ],
};

export default config;
