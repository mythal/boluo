import defaultConfig from 'ui/tailwind.config';

/** @type {import('tailwindcss').Config} */
const config = {
  ...defaultConfig,
  content: ['!../../**/node_modules/**', '../../packages/**/*.{tsx,ts,html}', '../../apps/**/*.{tsx,ts,html}'],
};

export default config;
