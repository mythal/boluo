import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: ['.env.local', '.env'].flatMap((filename) => [
    path.join(import.meta.dirname, filename),
    path.join(import.meta.dirname, '../..', filename),
  ]),
});

const legacyAssetBaseUrl = process.env.LEGACY_ASSET_BASE_URL ?? '/';

export default defineConfig({
  base: legacyAssetBaseUrl,
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(
      process.env.APP_VERSION ?? process.env.GITHUB_SHA ?? 'unknown',
    ),
  },
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },

  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'vendor';
          }
          if (
            id.includes('/node_modules/redux/') ||
            id.includes('/node_modules/react-redux/') ||
            id.includes('/node_modules/redux-thunk/')
          ) {
            return 'redux';
          }
        },
      },
    },
  },

  css: {
    devSourcemap: true,
  },
});
