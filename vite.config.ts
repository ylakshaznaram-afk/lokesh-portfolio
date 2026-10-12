import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps the build portable: it works from a domain root,
// a sub-path (e.g. GitHub Pages project sites) or a static file server.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    // three.js ships as one large module; it is lazy-loaded after first paint.
    chunkSizeWarningLimit: 600,
  },
});
