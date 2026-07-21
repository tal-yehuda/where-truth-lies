import { defineConfig } from 'vite';

// Static multi-page-free site: index.html at the root is the single entry point.
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
