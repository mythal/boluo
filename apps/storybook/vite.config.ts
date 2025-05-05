import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['formatjs', { idInterpolationPattern: '[sha512:contenthash:base64:6]', ast: true }],
        ],
      },
    }),
  ],
});
