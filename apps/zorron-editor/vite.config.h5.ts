import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

/**
 * Vite build config for the H5 Embed SDK (library mode).
 *
 * Produces `embed.js` (UMD + ESM) that exposes `window.ZorronPlayer`.
 * React and ReactDOM are externalized so consumers can share the host page's
 * React instance (or provide their own).
 *
 * Usage:
 *   pnpm --filter zorron-editor build:h5
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: './src/h5/embed.tsx',
      name: 'ZorronPlayer',
      fileName: 'embed',
      formats: ['umd', 'es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOM',
        },
      },
    },
    outDir: 'dist-h5',
    emptyOutDir: true,
    sourcemap: true,
  },
});
