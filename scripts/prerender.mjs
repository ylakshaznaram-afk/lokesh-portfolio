/**
 * Injects the server-rendered first screen into dist/index.html so the name,
 * role, actions and hero image are in the initial HTML (no waiting on JS),
 * and inlines the stylesheet (~13 KB gzipped) to remove the render-blocking
 * request. Runs as the last step of `npm run build`.
 */
import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ssrDir = path.join(ROOT, 'dist-ssr');
const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
const html = render();
if (/file:\/\//.test(html)) throw new Error('Prerendered HTML contains file:// URLs');

const indexPath = path.join(ROOT, 'dist/index.html');
let index = await readFile(indexPath, 'utf8');
const marker = '<div id="root"></div>';
if (!index.includes(marker)) throw new Error('dist/index.html has no empty #root to fill');
index = index.replace(marker, `<div id="root">${html}</div>`);

// Inline the stylesheet. Its url()s are relative to dist/assets/, so re-base them on the page.
const link = index.match(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/);
if (link) {
  const css = (await readFile(path.join(ROOT, 'dist', link[1]), 'utf8')).replace(/url\((['"]?)([^'")]+)\1\)/g, (all, q, u) => {
    // Leave absolute URLs, data URIs and fragment references (e.g. the SVG filter inside the grain texture) alone.
    if (/^(data:|https?:|#|%23|\/)/i.test(u)) return all;
    return `url(${q}./${path.posix.normalize(path.posix.join('assets', u))}${q})`;
  });
  if (css.includes('assets/%23')) throw new Error('prerender re-based a fragment url() inside the inlined CSS');
  index = index.replace(link[0], () => `<style>${css}</style>`);
  console.log(`✓ inlined ${link[1]} (${(css.length / 1024).toFixed(1)} KB)`);
}
await writeFile(indexPath, index);
await rm(ssrDir, { recursive: true, force: true });
console.log(`✓ prerendered first screen (${(html.length / 1024).toFixed(1)} KB of HTML)`);
