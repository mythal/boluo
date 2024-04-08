import type { Config } from 'tailwindcss';
import defaultConfig from '@boluo/ui/tailwind.config';

const config: Config = {
  ...defaultConfig,
  content: ['!../../**/node_modules/**', './src/**/*.{tsx,ts,html}', '../../packages/**/*.{tsx,ts,html}'],
};

export default config;
