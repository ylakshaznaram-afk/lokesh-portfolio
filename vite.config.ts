import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps the build portable: it works from a domain root,
// a sub-path (the GitHub Pages project site) or a static file server.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    // three.js ships as one large module; it is lazy-loaded after first paint.
    chunkSizeWarningLimit: 600,
  },
  experimental: {
    // Media imported from JS (images, JSON-adjacent assets) resolves relative
    // to the page — a single index.html at the site root — so the prerendered
    // HTML and the hydrating client produce identical URLs. Chunks, CSS and
    // everything else keep Vite's own relative URLs.
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js' && !/\.(m?js|css)$/.test(filename)) return './' + filename;
      return { relative: true };
    },
  },
});
