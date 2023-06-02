import defaultConfig from 'ui/tailwind.config';

/** @type {import('tailwindcss').Config} */
const config = {
  ...defaultConfig,
  content: [
    './src/**/*.{tsx,ts,html}',
    '../../packages/**/*.{tsx,ts,html}',
  ],
};

export default config;
