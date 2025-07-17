import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
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
        target: process.env.BACKEND_URL || 'https://production.boluochat.com',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },

  define: {
    'process.env.PUBLIC_BACKEND_URL': JSON.stringify(process.env.PUBLIC_BACKEND_URL),
  },

  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          redux: ['redux', 'react-redux', 'redux-thunk'],
        },
      },
    },
  },

  css: {
    devSourcemap: true,
  },
});
