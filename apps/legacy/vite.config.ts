import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import emotionBabelPlugin from '@boluo/emotion-babel-plugin';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: ['.env.local', '.env'].flatMap((filename) => [
    path.join(__dirname, filename),
    path.join(__dirname, '../..', filename),
  ]),
});

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
    }),
    babel({
      plugins: [emotionBabelPlugin],
    }),
    svgr({
      include: '**/*.svg',
      svgrOptions: {
        icon: true,
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
