import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [
          ['formatjs', { idInterpolationPattern: '[sha512:contenthash:base64:6]', ast: true }],
        ],
      },
    }),
  ],
});
