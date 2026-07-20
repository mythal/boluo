import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import formatjs from '@formatjs/unplugin/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    formatjs({
      idInterpolationPattern: '[sha512:contenthash:base64:6]',
      ast: true,
    }),
  ],
});
