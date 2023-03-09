import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // https://formatjs.io/docs/guides/advanced-usage#react-intl-without-parser-40-smaller
      '@formatjs/icu-messageformat-parser': '@formatjs/icu-messageformat-parser/no-parser',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000/',
        ws: true,
      },
    },
  },
  envDir: '../../',
  envPrefix: 'PUBLIC_',
  plugins: [react({
    babel: {
      configFile: true,
    },
  })],
});
